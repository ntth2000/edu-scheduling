package com.eduschedule.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubjectRequest {
    @NotBlank(message = "Tên môn học không được để trống")
    private String name;

    @NotBlank(message = "Tên viết tắt không được để trống")
    private String shortName;

    @NotNull(message = "Số tiết khối 1 không được để trống")
    @Min(value = 0, message = "Số tiết phải >= 0")
    private Integer periodsGrade1;

    @NotNull(message = "Số tiết khối 2 không được để trống")
    @Min(value = 0, message = "Số tiết phải >= 0")
    private Integer periodsGrade2;

    @NotNull(message = "Số tiết khối 3 không được để trống")
    @Min(value = 0, message = "Số tiết phải >= 0")
    private Integer periodsGrade3;

    @NotNull(message = "Số tiết khối 4 không được để trống")
    @Min(value = 0, message = "Số tiết phải >= 0")
    private Integer periodsGrade4;

    @NotNull(message = "Số tiết khối 5 không được để trống")
    @Min(value = 0, message = "Số tiết phải >= 0")
    private Integer periodsGrade5;
}
