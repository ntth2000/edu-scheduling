package com.eduschedule.scheduler.solver;

import ai.timefold.solver.core.api.domain.solution.PlanningEntityCollectionProperty;
import ai.timefold.solver.core.api.domain.solution.PlanningScore;
import ai.timefold.solver.core.api.domain.solution.PlanningSolution;
import ai.timefold.solver.core.api.domain.solution.ProblemFactCollectionProperty;
import ai.timefold.solver.core.api.domain.valuerange.ValueRangeProvider;
import ai.timefold.solver.core.api.score.HardSoftScore;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

// Planning solution: everything the solver needs for one "generate schedule" run —
// all candidate Timeslots plus every Lesson (pinned or not) that must land in one of them.
@PlanningSolution
@Getter
@Setter
@NoArgsConstructor
public class Timetable {

    @ValueRangeProvider(id = "timeslotRange")
    @ProblemFactCollectionProperty
    private List<Timeslot> timeslotList;

    @PlanningEntityCollectionProperty
    private List<Lesson> lessonList;

    @PlanningScore
    private HardSoftScore score;

    public Timetable(List<Timeslot> timeslotList, List<Lesson> lessonList) {
        this.timeslotList = timeslotList;
        this.lessonList = lessonList;
    }
}
