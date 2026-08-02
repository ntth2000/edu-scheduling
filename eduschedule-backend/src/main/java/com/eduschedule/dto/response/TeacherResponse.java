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
public class TeacherResponse {
    private Long id;
    private String fullName;
    private Integer maxPeriodsPerWeek;
    private List<SubjectResponse> subjects;
    private Integer currentPeriodsPerWeek;
    private String homeroomClassName;
    private Boolean scheduled;
}
