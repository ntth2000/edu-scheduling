package com.eduschedule.controller;

import com.eduschedule.dto.request.WeekStartDateRequest;
import com.eduschedule.dto.response.WeekResponse;
import com.eduschedule.service.WeekService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/weeks")
@RequiredArgsConstructor
public class WeekController {
    private final WeekService weekService;

    @GetMapping
    public ResponseEntity<List<WeekResponse>> getByTimetable(@RequestParam Long timetableId) {
        return ResponseEntity.ok(weekService.getByTimetable(timetableId));
    }

    @PatchMapping("/{id}/start-date")
    public ResponseEntity<List<WeekResponse>> updateStartDate(
            @PathVariable Long id,
            @RequestBody @Valid WeekStartDateRequest request) {
        return ResponseEntity.ok(weekService.updateStartDate(id, request.getStartDate()));
    }

    @PostMapping("/{sourceWeekId}/apply-forward")
    public ResponseEntity<Void> applyFromWeek(@PathVariable Long sourceWeekId) {
        weekService.applyFromWeek(sourceWeekId);
        return ResponseEntity.noContent().build();
    }
}
