package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolYearResponse {
    private Long id;
    private String name;
    private Integer startYear;
}
