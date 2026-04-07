package com.eduschedule.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HomeroomAssignmentRequest {

    @NotNull(message = "Lớp không được để trống")
    private Long classId;

    @NotNull(message = "Giáo viên không được để trống")
    private Long teacherId;
}