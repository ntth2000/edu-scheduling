package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialRoomResponse {
    private Long id;
    private String name;
    private Integer quantity;
    private Long subjectId;
    private String subjectName;
}
