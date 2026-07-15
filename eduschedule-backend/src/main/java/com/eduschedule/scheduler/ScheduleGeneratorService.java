package com.eduschedule.scheduler;

import ai.timefold.solver.core.api.solver.SolverManager;
import com.eduschedule.entity.*;
import com.eduschedule.repository.*;
import com.eduschedule.scheduler.model.AutoScheduleResult;
import com.eduschedule.scheduler.model.AutoScheduleSlot;
import com.eduschedule.scheduler.solver.Lesson;
import com.eduschedule.scheduler.solver.Timeslot;
import com.eduschedule.scheduler.solver.Timetable;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleGeneratorService {

    private final WeekRepository weekRepo;
    private final AssignmentRepository assignmentRepo;
    private final SpecialRoomRepository specialRoomRepo;
    private final SlotRepository slotRepo;
    private final SolverManager<Timetable> solverManager;

    @Transactional(readOnly = true)
    public AutoScheduleResult generate(Long weekId) {
        Week week = weekRepo.findById(weekId)
                .orElseThrow(() -> new IllegalArgumentException("Week not found: " + weekId));

        Long schoolYearId = week.getTimetable().getSchoolYear().getId();
        Long userId = week.getTimetable().getSchoolYear().getUser().getId();

        List<Assignment> allAssignments = assignmentRepo.findBySchoolClassSchoolYearId(schoolYearId);
        Map<Long, Integer> totalPeriodsMap = buildTotalPeriodsMap(allAssignments);

        // Count already-scheduled periods per assignment in this week
        List<Slot> existingSlots = slotRepo.findByWeekId(weekId);
        Map<Long, Long> scheduledCount = existingSlots.stream()
                .filter(s -> s.getAssignment() != null)
                .collect(Collectors.groupingBy(s -> s.getAssignment().getId(), Collectors.counting()));

        // Remaining = total − already scheduled; skip if nothing left to place
        Map<Long, Integer> periodsMap = new HashMap<>();
        for (Map.Entry<Long, Integer> e : totalPeriodsMap.entrySet()) {
            int remaining = e.getValue() - scheduledCount.getOrDefault(e.getKey(), 0L).intValue();
            if (remaining > 0) periodsMap.put(e.getKey(), remaining);
        }

        Map<Long, SpecialRoom> subjectToRoom = specialRoomRepo.findAllByUserId(userId).stream()
                .filter(r -> r.getSubject() != null)
                .collect(Collectors.toMap(r -> r.getSubject().getId(), r -> r, (a, b) -> a));

        // Base: assignments with a teacher and remaining periods to place
        List<Assignment> baseAssignments = allAssignments.stream()
                .filter(a -> a.getTeacher() != null)
                .filter(a -> periodsMap.containsKey(a.getId()))
                .collect(Collectors.toList());

        if (baseAssignments.isEmpty()) {
            return new AutoScheduleResult(Collections.emptyList(), Collections.emptyList());
        }

        Map<Long, Assignment> assignmentById = allAssignments.stream()
                .collect(Collectors.toMap(Assignment::getId, a -> a, (a, b) -> a));

        List<Lesson> lessonList = new ArrayList<>();
        lessonList.addAll(buildPinnedLessons(existingSlots, assignmentById, subjectToRoom));
        lessonList.addAll(buildUnassignedLessons(baseAssignments, periodsMap, subjectToRoom));

        Timetable problem = new Timetable(Timeslot.generateAll(), lessonList);
        Timetable solved;
        try {
            solved = solverManager.solve(UUID.randomUUID(), problem).getFinalBestSolution();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Xếp lịch tự động bị gián đoạn", e);
        } catch (ExecutionException e) {
            throw new IllegalStateException("Xếp lịch tự động thất bại", e.getCause());
        }

        return toResult(solved);
    }

    private Map<Long, Integer> buildTotalPeriodsMap(List<Assignment> allAssignments) {
        Map<Long, Integer> totalPeriodsMap = new HashMap<>();
        for (Assignment a : allAssignments) {
            int grade = a.getSchoolClass().getGrade();
            Subject s = a.getSubject();
            int periods = switch (grade) {
                case 1 -> s.getPeriodsGrade1() != null ? s.getPeriodsGrade1() : 0;
                case 2 -> s.getPeriodsGrade2() != null ? s.getPeriodsGrade2() : 0;
                case 3 -> s.getPeriodsGrade3() != null ? s.getPeriodsGrade3() : 0;
                case 4 -> s.getPeriodsGrade4() != null ? s.getPeriodsGrade4() : 0;
                case 5 -> s.getPeriodsGrade5() != null ? s.getPeriodsGrade5() : 0;
                default -> 0;
            };
            if (periods > 0) totalPeriodsMap.put(a.getId(), periods);
        }
        return totalPeriodsMap;
    }

    // Slots already saved in the DB for this week become pinned Lessons — the solver
    // fills the remaining periods around them but never moves them (see Lesson.pinned).
    private List<Lesson> buildPinnedLessons(List<Slot> existingSlots,
                                             Map<Long, Assignment> assignmentById,
                                             Map<Long, SpecialRoom> subjectToRoom) {
        List<Lesson> pinned = new ArrayList<>();
        for (Slot slot : existingSlots) {
            if (slot.getAssignment() == null) continue;
            Assignment a = assignmentById.get(slot.getAssignment().getId());
            if (a == null) continue;

            // Slots in DB use flat period (1-7); Timeslot uses within-session period (1-4 / 1-3)
            int flatPeriod = slot.getPeriod();
            int session = flatPeriod <= ScheduleConfig.PERIODS_MORNING ? 1 : 2;
            int withinPeriod = flatPeriod <= ScheduleConfig.PERIODS_MORNING
                    ? flatPeriod : flatPeriod - ScheduleConfig.PERIODS_MORNING;
            Timeslot timeslot = new Timeslot(slot.getDay(), session, withinPeriod);

            pinned.add(toLesson(a, "slot-" + slot.getId(), subjectToRoom, true, timeslot));
        }
        return pinned;
    }

    private List<Lesson> buildUnassignedLessons(List<Assignment> baseAssignments,
                                                 Map<Long, Integer> periodsMap,
                                                 Map<Long, SpecialRoom> subjectToRoom) {
        List<Lesson> lessons = new ArrayList<>();
        for (Assignment a : baseAssignments) {
            int periods = periodsMap.getOrDefault(a.getId(), 0);
            for (int i = 0; i < periods; i++) {
                lessons.add(toLesson(a, a.getId() + "-" + i, subjectToRoom, false, null));
            }
        }
        return lessons;
    }

    private Lesson toLesson(Assignment a, String id, Map<Long, SpecialRoom> subjectToRoom,
                             boolean pinned, Timeslot timeslot) {
        SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
        Teacher teacher = a.getTeacher();
        return Lesson.builder()
                .id(id)
                .assignmentId(a.getId())
                .classId(a.getSchoolClass().getId())
                .className(a.getSchoolClass().getName())
                .teacherId(teacher != null ? teacher.getId() : null)
                .teacherFullName(teacher != null ? teacher.getFullName() : null)
                .teacherMaxPeriodsPerWeek(teacher != null ? teacher.getMaxPeriodsPerWeek() : null)
                .subjectId(a.getSubject().getId())
                .subjectName(a.getSubject().getName())
                .specialRoomId(room != null ? room.getId() : null)
                .specialRoomCapacity(room != null ? room.getQuantity() : null)
                .pinned(pinned)
                .timeslot(timeslot)
                .build();
    }

    // Lessons caught in a hard-constraint violation are reported as errors instead of
    // being returned as slots — mirrors the old GreedyPhase behaviour of skipping a
    // requirement it couldn't place cleanly rather than silently double-booking it.
    private AutoScheduleResult toResult(Timetable solved) {
        List<Lesson> unpinned = solved.getLessonList().stream()
                .filter(l -> !l.isPinned())
                .collect(Collectors.toList());
        if (unpinned.isEmpty()) {
            return new AutoScheduleResult(Collections.emptyList(), Collections.emptyList());
        }

        // Fast path: solver reached a fully feasible schedule (the common case for a
        // reasonably sized problem within the configured time budget) — nothing to diagnose.
        Set<Lesson> conflicted = solved.getScore().hardScore() == 0
                ? Collections.emptySet()
                : findHardConflicts(solved.getLessonList());

        List<String> errors = conflicted.stream()
                .filter(l -> !l.isPinned())
                .map(l -> "Không thể xếp: lớp %s — %s (%s)".formatted(
                        l.getClassName(), l.getSubjectName(), l.getTeacherFullName()))
                .collect(Collectors.toList());

        List<AutoScheduleSlot> slots = unpinned.stream()
                .filter(l -> !conflicted.contains(l))
                .map(this::toAutoSlot)
                .collect(Collectors.toList());

        return new AutoScheduleResult(slots, deduplicateErrors(errors));
    }

    // Re-checks the same 4 hard rules as TimetableConstraintProvider, in plain Java, to find
    // which Lessons to report as errors when the solver couldn't reach hardScore == 0.
    // (Timefold's match-level ScoreAnalysis/SolutionManager.analyze() is commercial-only in 2.x,
    // so this only runs as a fallback diagnostic, not on the normal solving path.)
    private Set<Lesson> findHardConflicts(List<Lesson> allLessons) {
        Map<String, List<Lesson>> byClassSlot = new HashMap<>();
        Map<String, List<Lesson>> byTeacherSlot = new HashMap<>();
        Map<String, List<Lesson>> byRoomSlot = new HashMap<>();
        Map<String, List<Lesson>> byClassDaySession = new HashMap<>();
        Map<String, List<Lesson>> byClassDay = new HashMap<>();

        for (Lesson l : allLessons) {
            Timeslot t = l.getTimeslot();
            byClassSlot.computeIfAbsent(l.getClassId() + "_" + t, k -> new ArrayList<>()).add(l);
            byTeacherSlot.computeIfAbsent(l.getTeacherId() + "_" + t, k -> new ArrayList<>()).add(l);
            if (l.getSpecialRoomId() != null) {
                byRoomSlot.computeIfAbsent(l.getSpecialRoomId() + "_" + t, k -> new ArrayList<>()).add(l);
            }
            byClassDaySession.computeIfAbsent(l.getClassId() + "_" + t.getDay() + "_" + t.getSession(),
                    k -> new ArrayList<>()).add(l);
            byClassDay.computeIfAbsent(l.getClassId() + "_" + t.getDay(), k -> new ArrayList<>()).add(l);
        }

        Set<Lesson> conflicted = new HashSet<>();
        byClassSlot.values().stream().filter(g -> g.size() > 1).forEach(conflicted::addAll);
        byTeacherSlot.values().stream().filter(g -> g.size() > 1).forEach(conflicted::addAll);
        byRoomSlot.values().stream()
                .filter(g -> g.size() > g.get(0).getSpecialRoomCapacity())
                .forEach(conflicted::addAll);
        byClassDaySession.values().forEach(group -> {
            Set<Integer> periods = group.stream().map(l -> l.getTimeslot().getPeriod()).collect(Collectors.toSet());
            int max = periods.stream().mapToInt(Integer::intValue).max().orElse(0);
            if (max != periods.size()) conflicted.addAll(group); // a gap exists before the last used period
        });
        byClassDay.values().forEach(group -> {
            boolean hasAfternoon = group.stream().anyMatch(l -> l.getTimeslot().getSession() == 2);
            long morningPeriods = group.stream()
                    .filter(l -> l.getTimeslot().getSession() == 1)
                    .map(l -> l.getTimeslot().getPeriod())
                    .distinct().count();
            // mirrors TimetableConstraintProvider.afternoonRequiresCompleteMorningSession
            if (hasAfternoon && morningPeriods < ScheduleConfig.PERIODS_MORNING) conflicted.addAll(group);
        });

        return conflicted;
    }

    private AutoScheduleSlot toAutoSlot(Lesson l) {
        return new AutoScheduleSlot(
                l.getTimeslot().getDay(),
                l.getTimeslot().getFlatPeriod(),
                l.getClassName(),
                l.getClassId(),
                l.getSubjectId(),
                l.getSubjectName(),
                l.getTeacherId(),
                l.getTeacherFullName(),
                l.getAssignmentId()
        );
    }

    private List<String> deduplicateErrors(List<String> errors) {
        Map<String, Long> counts = errors.stream()
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()));
        return counts.entrySet().stream()
                .map(e -> e.getValue() > 1 ? e.getKey() + " (" + e.getValue() + " tiết)" : e.getKey())
                .sorted()
                .collect(Collectors.toList());
    }
}
