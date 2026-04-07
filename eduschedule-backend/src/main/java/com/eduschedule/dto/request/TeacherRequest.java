package com.eduschedule.dto.request;

import com.eduschedule.entity.enums.TeacherType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class TeacherRequest {
    @NotBlank(message = "Tên giáo viên không được để trống")
    private String fullName;

    @NotNull(message = "Loại giáo viên không được để trống")
    private TeacherType type;

    @NotNull(message = "Định mức tiết không được để trống")
    @Min(value = 1, message = "Định mức tiết phải lớn hơn 0")
    @Max(value = 23, message = "Định mức tiết không quá 23")
    private Integer maxPeriodsPerWeek;

    private List<Long> subjectIds;
}
