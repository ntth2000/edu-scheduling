package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotResponse {
    private Long id;
    private Long timetableId;
    private Long assignmentId;
    private Integer day;
    private Integer period;

    // Flattened assignment info
    private Long subjectId;
    private String subjectName;
    private Long teacherId;
    private String teacherName;
    private Long classId;
    private String className;
    private Integer grade;
}
