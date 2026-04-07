package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubjectResponse {
    private Long id;
    private String name;
    private String shortName;
    private Integer periodsGrade1;
    private Integer periodsGrade2;
    private Integer periodsGrade3;
    private Integer periodsGrade4;
    private Integer periodsGrade5;
}
