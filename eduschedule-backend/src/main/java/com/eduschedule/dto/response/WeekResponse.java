package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeekResponse {
    private Long id;
    private Integer weekNumber;
    private LocalDate startDate; 
    private LocalDate endDate; 
    private Boolean isPublished;
}
