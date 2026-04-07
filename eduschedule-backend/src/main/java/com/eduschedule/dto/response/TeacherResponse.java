package com.eduschedule.dto.response;

import com.eduschedule.entity.enums.TeacherType;
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
    private TeacherType type;
    private Integer maxPeriodsPerWeek;
    private Boolean isActive;
    private List<SubjectResponse> subjects;
    private Integer currentPeriodsPerWeek;
    private String homeroomClassName;
}
