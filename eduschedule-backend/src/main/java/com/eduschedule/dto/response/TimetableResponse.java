package com.eduschedule.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableResponse {
    private Long id;
    private String name;
    private String status; // DRAFT | PUBLISHED
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
}
