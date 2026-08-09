package com.eduschedule.controller;

import com.eduschedule.dto.request.WeekStartDateRequest;
import com.eduschedule.dto.response.WeekResponse;
import com.eduschedule.scheduler.ScheduleGeneratorService;
import com.eduschedule.scheduler.model.AutoScheduleResult;
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
    private final ScheduleGeneratorService scheduleGeneratorService;

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

    // Luôn trả 200 kể cả khi result.errors không rỗng — xếp tự động một phần vẫn là kết quả hợp lệ
    // (client hiển thị các tiết xếp được + số tiết xếp được/tổng số tiết, không coi là lỗi request).
    @PostMapping("/{weekId}/generate")
    public ResponseEntity<AutoScheduleResult> generate(@PathVariable Long weekId) {
        return ResponseEntity.ok(scheduleGeneratorService.generate(weekId));
    }
}
