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

// TẠM TẮT để thử nghiệm: bỏ khai báo comparatorClass thì Construction Heuristic không còn xếp
// theo 4 tầng độ khó (ghim > GVBM+phòng > GVBM > GVCN) mà duyệt Lesson theo đúng thứ tự trong
// lessonList. Khôi phục bằng cách bỏ comment dòng dưới và xoá dòng @PlanningEntity trống.
// @PlanningEntity(comparatorClass = LessonDifficultyComparator.class)
@PlanningEntity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lesson {

    @PlanningId
    private String id;

    private Long assignmentId;
    private Long classId;
    private String className;
    private Long teacherId;
    private String teacherFullName;
    private Long subjectId;
    private String subjectName;
    private Long specialRoomId;
    private Integer specialRoomCapacity; // SpecialRoom.quantity, only meaningful when specialRoomId != null

    // How many distinct classes this lesson's teacher covers across the school year. A "giáo viên
    // bộ môn" spans many classes and is therefore hard to place; a homeroom teacher usually has 1.
    private int teacherClassCount;
    // True when the teacher is the homeroom teacher (GVCN) of this lesson's own class.
    private boolean homeroomTeacher;

    // True for slots that already exist in the DB for this week (see Slot) — the solver
    // must not move these, only fill in the remaining, unscheduled periods around them.
    @PlanningPin
    private boolean pinned;

    @PlanningVariable(valueRangeProviderRefs = "timeslotRange")
    private Timeslot timeslot;
}
