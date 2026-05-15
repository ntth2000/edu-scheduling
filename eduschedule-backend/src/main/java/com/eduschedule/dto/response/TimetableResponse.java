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
    private Long schoolYearId;
    private String schoolYearName;
    private Integer semesterOrder;
    private String status;
    private Integer offDay;
    private Integer offSession;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
}
