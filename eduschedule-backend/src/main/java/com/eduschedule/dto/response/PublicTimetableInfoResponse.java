package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicTimetableInfoResponse {
    private String schoolYearName;
    private Integer semesterOrder;
    private List<ClassResponse> classes;
    private List<TeacherResponse> teachers;
    private List<SubjectResponse> subjects;
    private List<AssignmentResponse> assignments;
}
