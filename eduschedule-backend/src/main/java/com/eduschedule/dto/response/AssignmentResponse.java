package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentResponse {
    private Long id;
    private Long classId;
    private String className;
    private Integer grade;
    private Long subjectId;
    private String subjectName;
    private String subjectShortName;
    private Long teacherId;
    private String teacherName;
    private Integer periodsPerWeek;
}