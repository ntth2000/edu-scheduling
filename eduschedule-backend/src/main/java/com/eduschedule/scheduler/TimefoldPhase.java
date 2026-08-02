package com.eduschedule.scheduler;

import ai.timefold.solver.core.api.solver.SolverFactory;
import com.eduschedule.entity.Assignment;
import com.eduschedule.scheduler.model.SlotEntry;
import com.eduschedule.scheduler.solver.Lesson;
import com.eduschedule.scheduler.solver.Timeslot;
import com.eduschedule.scheduler.solver.Timetable;

import java.util.*;

// Takes a grid that GreedyPhase already filled with a feasible (all-hard-constraints-satisfied)
// solution and hands it to Timefold as an already-initialized Timetable — every Lesson gets its
// timeslot set up front, so the solver skips Construction Heuristic and goes straight to Local
// Search to improve the soft-constraint score (SC1-SC6 in TimetableConstraintProvider).
class TimefoldPhase {

    List<Lesson> run(ScheduleGrid grid, SolverFactory<Timetable> solverFactory) {
        List<Timeslot> timeslotList = Timeslot.generateAll();
        Map<String, Timeslot> timeslotIndex = new HashMap<>();
        for (Timeslot ts : timeslotList) {
            timeslotIndex.put(timeslotKey(ts.getDay(), ts.getSession(), ts.getPeriod()), ts);
        }

        List<Lesson> lessonList = new ArrayList<>();
        Map<Long, Integer> occurrence = new HashMap<>();
        for (SlotEntry entry : grid.toSlotEntries()) {
            Assignment a = entry.assignment();
            int idx = occurrence.merge(a.getId(), 1, Integer::sum) - 1;
            boolean pinned = grid.isLocked(a.getSchoolClass().getId(), entry.day(), entry.session(), entry.period());

            lessonList.add(Lesson.builder()
                    .id(a.getId() + "-" + idx)
                    .assignmentId(a.getId())
                    .classId(a.getSchoolClass().getId())
                    .className(a.getSchoolClass().getName())
                    .teacherId(a.getTeacher() != null ? a.getTeacher().getId() : null)
                    .teacherFullName(a.getTeacher() != null ? a.getTeacher().getFullName() : null)
                    .teacherMaxPeriodsPerWeek(a.getTeacher() != null ? a.getTeacher().getMaxPeriodsPerWeek() : null)
                    .subjectId(a.getSubject().getId())
                    .subjectName(a.getSubject().getName())
                    .specialRoomId(entry.specialRoom() != null ? entry.specialRoom().getId() : null)
                    .specialRoomCapacity(entry.specialRoom() != null ? entry.specialRoom().getQuantity() : null)
                    .pinned(pinned)
                    .timeslot(timeslotIndex.get(timeslotKey(entry.day(), entry.session(), entry.period())))
                    .build());
        }

        Timetable problem = new Timetable(timeslotList, lessonList);
        Timetable solution = solverFactory.buildSolver().solve(problem);
        return solution.getLessonList();
    }

    private String timeslotKey(int day, int session, int period) {
        return day + "_" + session + "_" + period;
    }
}
