package com.eduschedule.scheduler;

import ai.timefold.solver.core.api.solver.SolverFactory;
import com.eduschedule.entity.*;
import com.eduschedule.entity.enums.TeacherType;
import com.eduschedule.repository.*;
import com.eduschedule.scheduler.model.AutoScheduleResult;
import com.eduschedule.scheduler.model.AutoScheduleSlot;
import com.eduschedule.scheduler.model.SlotEntry;
import com.eduschedule.scheduler.solver.Lesson;
import com.eduschedule.scheduler.solver.Timeslot;
import com.eduschedule.scheduler.solver.Timetable;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // Base: assignments with a teacher and remaining periods to place
        List<Assignment> baseAssignments = allAssignments.stream()
                .filter(a -> a.getTeacher() != null)
                .filter(a -> periodsMap.containsKey(a.getId()))
                .collect(Collectors.toList());

        if (baseAssignments.isEmpty()) {
            return new AutoScheduleResult(Collections.emptyList(), Collections.emptyList());
        }

        // Group 1: all subject teachers (non-homeroom)
        List<Assignment> group1 = baseAssignments.stream()
                .filter(a -> a.getTeacher().getType() != TeacherType.CHU_NHIEM)
                .collect(Collectors.toList());

        // Group 2: homeroom teachers → fill remaining slots last
        List<Assignment> group2 = baseAssignments.stream()
                .filter(a -> a.getTeacher().getType() == TeacherType.CHU_NHIEM)
                .collect(Collectors.toList());

        GreedyPhase greedy = new GreedyPhase();
        ScheduleGrid bestGrid = null;
        List<String> bestErrors = Collections.emptyList();
        int minErrorCount = Integer.MAX_VALUE;

        for (int attempt = 1; attempt <= ScheduleConfig.MAX_GREEDY_ATTEMPTS; attempt++) {
            List<String> attemptErrors = new ArrayList<>();
            ScheduleGrid startGrid = buildPrePopulatedGrid(rooms, existingSlots, allAssignments);
            ScheduleGrid result = greedy.run(group1, group2, periodsMap, startGrid, attemptErrors);
            if (attemptErrors.isEmpty()) {
                bestGrid = result;
                bestErrors = Collections.emptyList();
                break;
            }
            if (attemptErrors.size() < minErrorCount) {
                minErrorCount = attemptErrors.size();
                bestGrid = result;
                bestErrors = new ArrayList<>(attemptErrors);
            }
        }

        List<AutoScheduleSlot> newSlots;
        if (bestErrors.isEmpty()) {
            // Greedy already found a solution satisfying every hard constraint — hand it to
            // Timefold (already-initialized, so it skips Construction Heuristic) to optimize
            // the soft constraints via Local Search.
            List<Lesson> solvedLessons = new TimefoldPhase().run(bestGrid, solverFactory);
            newSlots = solvedLessons.stream()
                    .filter(l -> !l.isPinned())
                    .map(this::toAutoSlot)
                    .collect(Collectors.toList());
        } else {
            newSlots = bestGrid.toNewSlotEntries().stream()
                    .map(e -> toAutoSlot(e))
                    .collect(Collectors.toList());
        }

        return new AutoScheduleResult(newSlots, deduplicateErrors(bestErrors));
    }

    private ScheduleGrid buildPrePopulatedGrid(List<SpecialRoom> rooms,
                                               List<Slot> existingSlots,
                                               List<Assignment> allAssignments) {
        Map<Long, Assignment> assignmentMap = allAssignments.stream()
                .collect(Collectors.toMap(Assignment::getId, a -> a, (a, b) -> a));

        ScheduleGrid grid = new ScheduleGrid(rooms);

        for (Slot slot : existingSlots) {
            if (slot.getAssignment() == null) continue;
            Assignment a = assignmentMap.get(slot.getAssignment().getId());
            if (a == null) continue;

            // Slots in DB use flat period (1-7); grid uses within-session period (1-4 / 1-3)
            int flatPeriod = slot.getPeriod();
            int session = flatPeriod <= 4 ? 1 : 2;
            int withinPeriod = flatPeriod <= 4 ? flatPeriod : flatPeriod - 4;

            grid.placeLocked(a, slot.getDay(), session, withinPeriod);
        }

        return grid;
    }

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
