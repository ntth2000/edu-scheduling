package com.eduschedule.controller;

import com.eduschedule.dto.request.TimetableRequest;
import com.eduschedule.dto.response.TimetableResponse;
import com.eduschedule.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/timetables")
@RequiredArgsConstructor
public class TimetableController {
    private final TimetableService timetableService;

    @GetMapping
    public ResponseEntity<List<TimetableResponse>> getAll() {
        return ResponseEntity.ok(timetableService.getAll());
    }

    @PostMapping
    public ResponseEntity<TimetableResponse> create(@RequestBody TimetableRequest request) {
        return ResponseEntity.ok(timetableService.create(request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TimetableResponse> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || (!status.equals("DRAFT") && !status.equals("PUBLISHED"))) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(timetableService.updateStatus(id, status));
    }
}
