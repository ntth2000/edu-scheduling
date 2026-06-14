package com.eduschedule.controller;

import com.eduschedule.dto.request.TimetableRequest;
import com.eduschedule.dto.response.TimetableResponse;
import com.eduschedule.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/timetables")
@RequiredArgsConstructor
public class TimetableController {
    private final TimetableService timetableService;

    @GetMapping
    public ResponseEntity<List<TimetableResponse>> getAll(
            @RequestParam(required = false) Long schoolYearId) {
        if (schoolYearId != null) {
            return ResponseEntity.ok(timetableService.getBySchoolYear(schoolYearId));
        }
        return ResponseEntity.ok(timetableService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TimetableResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(timetableService.getById(id));
    }

}
