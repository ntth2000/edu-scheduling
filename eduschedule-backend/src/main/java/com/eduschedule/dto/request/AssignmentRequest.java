package com.eduschedule.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignmentRequest {

    @NotNull(message = "Lớp không được để trống")
    private Long classId;

    @NotNull(message = "Môn học không được để trống")
    private Long subjectId;

    @NotNull(message = "Giáo viên không được để trống")
    private Long teacherId;
}