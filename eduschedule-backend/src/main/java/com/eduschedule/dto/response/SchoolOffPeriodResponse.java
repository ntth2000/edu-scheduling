// dto/response/SchoolOffPeriodResponse.java
package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolOffPeriodResponse {
    private Integer day;
    private String dayName;
    private List<Integer> periods;
    private String description;
}