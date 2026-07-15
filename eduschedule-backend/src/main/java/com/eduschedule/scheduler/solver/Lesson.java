package com.eduschedule.scheduler.solver;

import ai.timefold.solver.core.api.domain.common.PlanningId;
import ai.timefold.solver.core.api.domain.entity.PlanningEntity;
import ai.timefold.solver.core.api.domain.entity.PlanningPin;
import ai.timefold.solver.core.api.domain.variable.PlanningVariable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Planning entity: one period of an Assignment that needs (or already has) a Timeslot.
// Denormalized (ids + names) on purpose so the solver clones plain data, not JPA proxies —
// map back to Assignment/Slot only when persisting the solved result.
@PlanningEntity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lesson {

    @PlanningId
    private String id; // assignmentId + "-" + index within that assignment's remaining periods

    private Long assignmentId;
    private Long classId;
    private String className;
    private Long teacherId;
    private String teacherFullName;
    private Integer teacherMaxPeriodsPerWeek; // Teacher.maxPeriodsPerWeek, for the SC5 weekly-limit constraint
    private Long subjectId;
    private String subjectName;
    private Long specialRoomId; // null if the subject doesn't need a dedicated room
    private Integer specialRoomCapacity; // SpecialRoom.quantity, only meaningful when specialRoomId != null

    // True for slots that already exist in the DB for this week (see Slot) — the solver
    // must not move these, only fill in the remaining, unscheduled periods around them.
    @PlanningPin
    private boolean pinned;

    @PlanningVariable(valueRangeProviderRefs = "timeslotRange")
    private Timeslot timeslot;
}
