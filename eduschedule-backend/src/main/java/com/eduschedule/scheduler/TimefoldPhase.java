package com.eduschedule.scheduler;

import ai.timefold.solver.core.api.solver.SolverFactory;
import com.eduschedule.scheduler.solver.Lesson;
import com.eduschedule.scheduler.solver.Timeslot;
import com.eduschedule.scheduler.solver.Timetable;

import java.util.List;

// Hands a fully-built Timetable problem to Timefold and returns the solved Lesson list.
// Pinned lessons (existing DB slots) already have a timeslot and are never moved; unpinned ones
// start with timeslot=null, so Timefold runs Construction Heuristic to place them first, then
// Local Search refines the whole solution (soft constraints) within the configured time limit.
class TimefoldPhase {

    List<Lesson> run(List<Lesson> lessonList, List<Timeslot> timeslotList, SolverFactory<Timetable> solverFactory) {
        Timetable problem = new Timetable(timeslotList, lessonList);
        Timetable solution = solverFactory.buildSolver().solve(problem);
        return solution.getLessonList();
    }
}
