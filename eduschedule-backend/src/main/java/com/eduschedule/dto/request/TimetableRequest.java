package com.eduschedule.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TimetableRequest {
    @NotNull
    private Long schoolYearId;

    @NotNull
    @Min(1) @Max(2)
    private Integer semesterOrder;

    @Min(2) @Max(6)
    private Integer offDay;

    @Min(1) @Max(2)
    private Integer offSession;
}
