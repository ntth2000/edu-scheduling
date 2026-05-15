package com.eduschedule.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SchoolYearRequest {
    @NotNull(message = "Năm bắt đầu không được để trống")
    @Min(value = 2000, message = "Năm bắt đầu phải từ 2000")
    @Max(value = 2100, message = "Năm bắt đầu không hợp lệ")
    private Integer startYear;
}
