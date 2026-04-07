package com.eduschedule.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ClassRequest {
    @NotBlank(message = "Tên lớp không được để trống")
    private String name;

    @NotNull(message = "Khối không được để trống")
    @Min(value = 1, message = "Khối phải từ 1 đến 5")
    @Max(value = 5, message = "Khối phải từ 1 đến 5")
    private Integer grade;

    private Long homeroomTeacherId;
}
