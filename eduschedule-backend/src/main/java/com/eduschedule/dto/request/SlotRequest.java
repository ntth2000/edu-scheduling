package com.eduschedule.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotRequest {
    @NotNull(message = "Timetable ID is required")
    private Long timetableId;

    // Either assignmentId OR (classId + subjectId) must be provided
    private Long assignmentId;

    // Used when assignmentId is null (GVCN-taught subject — auto-resolves via homeroom teacher)
    private Long classId;
    private Long subjectId;

    @NotNull(message = "Day is required")
    @Min(value = 2, message = "Day must be between 2 (Mon) and 6 (Fri)")
    @Max(value = 6, message = "Day must be between 2 (Mon) and 6 (Fri)")
    private Integer day;

    @NotNull(message = "Period is required")
    @Min(value = 1, message = "Period must be between 1 and 7")
    @Max(value = 7, message = "Period must be between 1 and 7")
    private Integer period;
}
