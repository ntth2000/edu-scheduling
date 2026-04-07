package com.eduschedule.controller;

import com.eduschedule.dto.request.SchoolOffPeriodRequest;
import com.eduschedule.dto.response.SchoolOffPeriodResponse;
import com.eduschedule.service.SchoolOffPeriodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/school-off-periods")
@RequiredArgsConstructor
public class SchoolOffPeriodController {

    private final SchoolOffPeriodService service;

    // GET /api/school-off-periods
    @GetMapping
    public ResponseEntity<List<SchoolOffPeriodResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    // POST /api/school-off-periods
    @PostMapping
    public ResponseEntity<SchoolOffPeriodResponse> setOffPeriods(
            @Valid @RequestBody SchoolOffPeriodRequest request
    ) {
        return ResponseEntity.ok(
                service.setOffPeriods(request)
        );
    }

    // DELETE /api/school-off-periods/{day}
    @DeleteMapping("/{day}")
    public ResponseEntity<Void> clearByDay(
            @PathVariable Integer day
    ) {
        service.clearByDay(day);
        return ResponseEntity.noContent().build();
    }
}