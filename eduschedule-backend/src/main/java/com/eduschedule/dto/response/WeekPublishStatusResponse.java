package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeekPublishStatusResponse {
    private Long weekId;
    private Integer weekNumber;
    private Boolean isPublished;
    private Boolean eligible;
    private String reason;
}
