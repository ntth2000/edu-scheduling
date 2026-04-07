// dto/request/SchoolOffPeriodRequest.java
package com.eduschedule.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class SchoolOffPeriodRequest {

    @NotNull
    @Min(value = 2, message = "Thứ phải từ 2 đến 6")
    @Max(value = 6, message = "Thứ phải từ 2 đến 6")
    private Integer day;

    @NotNull
    @Size(min = 1, message = "Phải có ít nhất 1 tiết nghỉ")
    private List<Integer> periods;

    private String description;
}