package com.eduschedule.controller;

import com.eduschedule.dto.response.PublicTimetableInfoResponse;
import com.eduschedule.dto.response.SlotResponse;
import com.eduschedule.dto.response.WeekResponse;
import com.eduschedule.service.PublicTimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public/timetables")
@RequiredArgsConstructor
public class PublicTimetableController {
    private final PublicTimetableService publicTimetableService;

    @GetMapping("/{token}")
    public ResponseEntity<PublicTimetableInfoResponse> getInfo(@PathVariable String token) {
        return ResponseEntity.ok(publicTimetableService.getInfo(token));
    }

    @GetMapping("/{token}/weeks")
    public ResponseEntity<List<WeekResponse>> getWeeks(@PathVariable String token) {
        return ResponseEntity.ok(publicTimetableService.getWeeks(token));
    }

    @GetMapping("/{token}/slots")
    public ResponseEntity<List<SlotResponse>> getSlots(
            @PathVariable String token, @RequestParam Long weekId) {
        return ResponseEntity.ok(publicTimetableService.getSlots(token, weekId));
    }
}
