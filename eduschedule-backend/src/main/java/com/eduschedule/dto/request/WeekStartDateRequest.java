package com.eduschedule.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class WeekStartDateRequest {
    @NotNull
    private LocalDate startDate;
}
