package com.eduschedule.scheduler;

import ai.timefold.solver.core.api.solver.SolverFactory;
import com.eduschedule.entity.*;
import com.eduschedule.repository.*;
import com.eduschedule.scheduler.model.AutoScheduleResult;
import com.eduschedule.scheduler.model.AutoScheduleSlot;
import com.eduschedule.scheduler.model.SlotEntry;
import com.eduschedule.scheduler.solver.Lesson;
import com.eduschedule.scheduler.solver.Timeslot;
import com.eduschedule.scheduler.solver.Timetable;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScheduleGeneratorService {

    private final WeekRepository weekRepo;
    private final AssignmentRepository assignmentRepo;
    private final SpecialRoomRepository specialRoomRepo;
    private final SlotRepository slotRepo;
    private final SolverFactory<Timetable> solverFactory;

    @Transactional(readOnly = true)
    public AutoScheduleResult generate(Long weekId) {
        Week week = weekRepo.findById(weekId)
                .orElseThrow(() -> new IllegalArgumentException("Week not found: " + weekId));
        if (Boolean.TRUE.equals(week.getIsPublished())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tuần đã công bố, cần hủy công bố trước khi xếp lại");
        }

        Long schoolYearId = week.getTimetable().getSchoolYear().getId();
        Long userId = week.getTimetable().getSchoolYear().getUser().getId();

        List<Assignment> allAssignments = assignmentRepo.findBySchoolClassSchoolYearId(schoolYearId);

        // Build total periods/week per assignment from subject grade config
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

        // Count already-scheduled periods per assignment in this week
        List<Slot> existingSlots = slotRepo.findByWeekId(weekId);
        Map<Long, Long> scheduledCount = existingSlots.stream()
                .filter(s -> s.getAssignment() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getAssignment().getId(),
                        Collectors.counting()
                ));

        // Remaining = total − already scheduled; skip if nothing left to place
        Map<Long, Integer> periodsMap = new HashMap<>();
        for (Map.Entry<Long, Integer> e : totalPeriodsMap.entrySet()) {
            int remaining = e.getValue() - scheduledCount.getOrDefault(e.getKey(), 0L).intValue();
            if (remaining > 0) periodsMap.put(e.getKey(), remaining);
        }

        List<SpecialRoom> rooms = specialRoomRepo.findAllByUserId(userId);
        Map<Long, SpecialRoom> subjectToRoom = rooms.stream()
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

        // --- Greedy construction phase: DISABLED (2026-08-04, theo yêu cầu) — Timefold một
        // mình vừa xây (Construction Heuristic) vừa tối ưu (Local Search) toàn bộ bài toán bên
        // dưới. Giữ nguyên khối này ở dạng comment để dễ bật lại nếu cần.
        //
        // GreedyPhase greedy = new GreedyPhase();
        // ScheduleGrid bestGrid = null;
        // List<String> bestErrors = Collections.emptyList();
        // int minErrorCount = Integer.MAX_VALUE;
        //
        // for (int attempt = 1; attempt <= ScheduleConfig.MAX_GREEDY_ATTEMPTS; attempt++) {
        //     List<String> attemptErrors = new ArrayList<>();
        //     ScheduleGrid startGrid = buildPrePopulatedGrid(rooms, existingSlots, allAssignments);
        //     ScheduleGrid result = greedy.run(baseAssignments, periodsMap, startGrid, attemptErrors);
        //     if (attemptErrors.isEmpty()) {
        //         bestGrid = result;
        //         bestErrors = Collections.emptyList();
        //         break;
        //     }
        //     if (attemptErrors.size() < minErrorCount) {
        //         minErrorCount = attemptErrors.size();
        //         bestGrid = result;
        //         bestErrors = new ArrayList<>(attemptErrors);
        //     }
        // }
        //
        // List<AutoScheduleSlot> newSlots;
        // if (bestErrors.isEmpty()) {
        //     List<Lesson> solvedLessons = new TimefoldPhase().run(bestGrid, solverFactory);
        //     newSlots = solvedLessons.stream()
        //             .filter(l -> !l.isPinned())
        //             .map(this::toAutoSlot)
        //             .collect(Collectors.toList());
        // } else {
        //     newSlots = bestGrid.toNewSlotEntries().stream()
        //             .map(e -> toAutoSlot(e))
        //             .collect(Collectors.toList());
        // }
        //
        // return new AutoScheduleResult(newSlots, deduplicateErrors(bestErrors));

        List<Timeslot> timeslotList = Timeslot.generateAll();
        Map<String, Timeslot> timeslotIndex = new HashMap<>();
        for (Timeslot ts : timeslotList) {
            timeslotIndex.put(timeslotKey(ts.getDay(), ts.getSession(), ts.getPeriod()), ts);
        }
        Map<Long, Assignment> assignmentMap = allAssignments.stream()
                .collect(Collectors.toMap(Assignment::getId, a -> a, (a, b) -> a));

        List<Lesson> lessonList = new ArrayList<>();
        Map<Long, Integer> occurrence = new HashMap<>();

        // Pinned: slots already saved for this week — Timefold must never move these.
        for (Slot slot : existingSlots) {
            if (slot.getAssignment() == null) continue;
            Assignment a = assignmentMap.get(slot.getAssignment().getId());
            if (a == null) continue;

            // Slots in DB use flat period (1-7); solver's Timeslot uses within-session period.
            int flatPeriod = slot.getPeriod();
            int session = flatPeriod <= 4 ? 1 : 2;
            int withinPeriod = flatPeriod <= 4 ? flatPeriod : flatPeriod - 4;
            lessonList.add(buildLesson(a, occurrence, subjectToRoom, true,
                    timeslotIndex.get(timeslotKey(slot.getDay(), session, withinPeriod))));
        }

        // Unsolved: remaining periods to place — Timefold's Construction Heuristic assigns these.
        for (Assignment a : baseAssignments) {
            int count = periodsMap.get(a.getId());
            for (int i = 0; i < count; i++) {
                lessonList.add(buildLesson(a, occurrence, subjectToRoom, false, null));
            }
        }

        List<Lesson> solvedLessons = new TimefoldPhase().run(lessonList, timeslotList, solverFactory);

        // Timefold Community Edition doesn't expose which lesson caused a remaining hard-constraint
        // violation (that "explain"/indictment API is Enterprise-only) — re-check the 3 hard
        // constraints that can be attributed to a specific lesson (class/teacher double-booking,
        // special-room over-capacity) ourselves. The other 2 hard constraints (no gap within a
        // session, afternoon requires a complete morning) aren't attributable to one lesson and are
        // trusted to Local Search, which treats every hard constraint as effectively infinite weight.
        Set<String> conflicted = findAttributableHardConflicts(solvedLessons);

        List<AutoScheduleSlot> newSlots = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        for (Lesson lesson : solvedLessons) {
            if (lesson.isPinned()) continue;
            if (conflicted.contains(lesson.getId())) {
                errors.add("Không thể xếp: lớp %s — %s (%s)".formatted(
                        lesson.getClassName(), lesson.getSubjectName(),
                        lesson.getTeacherFullName() != null ? lesson.getTeacherFullName() : "GVCN"));
            } else {
                newSlots.add(toAutoSlot(lesson));
            }
        }

        return new AutoScheduleResult(newSlots, deduplicateErrors(errors));
    }

    private Lesson buildLesson(Assignment a, Map<Long, Integer> occurrence, Map<Long, SpecialRoom> subjectToRoom,
                                boolean pinned, Timeslot timeslot) {
        int idx = occurrence.merge(a.getId(), 1, Integer::sum) - 1;
        SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
        return Lesson.builder()
                .id(a.getId() + "-" + idx)
                .assignmentId(a.getId())
                .classId(a.getSchoolClass().getId())
                .className(a.getSchoolClass().getName())
                .teacherId(a.getTeacher() != null ? a.getTeacher().getId() : null)
                .teacherFullName(a.getTeacher() != null ? a.getTeacher().getFullName() : null)
                .teacherMaxPeriodsPerWeek(a.getTeacher() != null ? a.getTeacher().getMaxPeriodsPerWeek() : null)
                .subjectId(a.getSubject().getId())
                .subjectName(a.getSubject().getName())
                .specialRoomId(room != null ? room.getId() : null)
                .specialRoomCapacity(room != null ? room.getQuantity() : null)
                .pinned(pinned)
                .timeslot(timeslot)
                .build();
    }

    private Set<String> findAttributableHardConflicts(List<Lesson> lessons) {
        Set<String> conflicted = new HashSet<>();
        Map<String, List<Lesson>> byClassSlot = new HashMap<>();
        Map<String, List<Lesson>> byTeacherSlot = new HashMap<>();
        Map<String, List<Lesson>> byRoomSlot = new HashMap<>();

        for (Lesson l : lessons) {
            if (l.getTimeslot() == null) {
                conflicted.add(l.getId());
                continue;
            }
            String ts = timeslotKey(l.getTimeslot().getDay(), l.getTimeslot().getSession(), l.getTimeslot().getPeriod());
            byClassSlot.computeIfAbsent(l.getClassId() + "_" + ts, k -> new ArrayList<>()).add(l);
            if (l.getTeacherId() != null) {
                byTeacherSlot.computeIfAbsent(l.getTeacherId() + "_" + ts, k -> new ArrayList<>()).add(l);
            }
            if (l.getSpecialRoomId() != null) {
                byRoomSlot.computeIfAbsent(l.getSpecialRoomId() + "_" + ts, k -> new ArrayList<>()).add(l);
            }
        }

        byClassSlot.values().stream().filter(g -> g.size() > 1)
                .forEach(g -> g.forEach(l -> conflicted.add(l.getId())));
        byTeacherSlot.values().stream().filter(g -> g.size() > 1)
                .forEach(g -> g.forEach(l -> conflicted.add(l.getId())));
        byRoomSlot.values().stream().filter(g -> g.size() > g.get(0).getSpecialRoomCapacity())
                .forEach(g -> g.forEach(l -> conflicted.add(l.getId())));

        return conflicted;
    }

    private String timeslotKey(int day, int session, int period) {
        return day + "_" + session + "_" + period;
    }

    // private ScheduleGrid buildPrePopulatedGrid(List<SpecialRoom> rooms,
    //                                            List<Slot> existingSlots,
    //                                            List<Assignment> allAssignments) {
    //     Map<Long, Assignment> assignmentMap = allAssignments.stream()
    //             .collect(Collectors.toMap(Assignment::getId, a -> a, (a, b) -> a));
    //
    //     ScheduleGrid grid = new ScheduleGrid(rooms);
    //
    //     for (Slot slot : existingSlots) {
    //         if (slot.getAssignment() == null) continue;
    //         Assignment a = assignmentMap.get(slot.getAssignment().getId());
    //         if (a == null) continue;
    //
    //         // Slots in DB use flat period (1-7); grid uses within-session period (1-4 / 1-3)
    //         int flatPeriod = slot.getPeriod();
    //         int session = flatPeriod <= 4 ? 1 : 2;
    //         int withinPeriod = flatPeriod <= 4 ? flatPeriod : flatPeriod - 4;
    //
    //         grid.placeLocked(a, slot.getDay(), session, withinPeriod);
    //     }
    //
    //     return grid;
    // }

    private List<String> deduplicateErrors(List<String> errors) {
        Map<String, Long> counts = errors.stream()
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()));
        return counts.entrySet().stream()
                .map(e -> e.getValue() > 1 ? e.getKey() + " (" + e.getValue() + " tiết)" : e.getKey())
                .sorted()
                .collect(Collectors.toList());
    }

    private AutoScheduleSlot toAutoSlot(SlotEntry e) {
        Assignment a = e.assignment();
        int flatPeriod = e.session() == 1 ? e.period() : e.period() + 4;
        return new AutoScheduleSlot(
                e.day(),
                flatPeriod,
                a.getSchoolClass().getName(),
                a.getSchoolClass().getId(),
                a.getSubject().getId(),
                a.getSubject().getName(),
                a.getTeacher() != null ? a.getTeacher().getId() : null,
                a.getTeacher() != null ? a.getTeacher().getFullName() : null,
                a.getId()
        );
    }

    private AutoScheduleSlot toAutoSlot(Lesson lesson) {
        Timeslot ts = lesson.getTimeslot();
        return new AutoScheduleSlot(
                ts.getDay(),
                ts.getFlatPeriod(),
                lesson.getClassName(),
                lesson.getClassId(),
                lesson.getSubjectId(),
                lesson.getSubjectName(),
                lesson.getTeacherId(),
                lesson.getTeacherFullName(),
                lesson.getAssignmentId()
        );
    }
}
