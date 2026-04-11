package com.eduschedule.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimetableRequest {
    private String name; // optional label, e.g. "HK1 2024-2025"
}
