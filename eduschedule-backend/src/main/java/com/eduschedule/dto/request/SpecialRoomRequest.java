package com.eduschedule.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SpecialRoomRequest {
    @NotBlank(message = "Tên phòng không được để trống")
    private String name;

    @NotNull(message = "Số lượng phòng không được để trống")
    @Min(value = 1, message = "Số lượng phòng phải >= 1")
    private Integer quantity;

    private Long subjectId;
}
