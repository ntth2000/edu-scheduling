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
    private LocalDate startDate;  // null khi chưa set
    private LocalDate endDate;    // null khi startDate chưa set
}
