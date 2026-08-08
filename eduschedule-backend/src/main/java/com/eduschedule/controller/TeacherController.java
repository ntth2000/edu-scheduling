package com.eduschedule.controller;

import com.eduschedule.dto.request.TeacherRequest;
import com.eduschedule.dto.response.BatchDeleteCascadeResponse;
import com.eduschedule.dto.response.TeacherResponse;
import com.eduschedule.service.TeacherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teachers")
@RequiredArgsConstructor
public class TeacherController {
    private final TeacherService teacherService;

    // GET /api/teachers
    // GET /api/teachers?year=2026-2027 — year tuỳ chọn, giới hạn thông tin chủ nhiệm về năm học đó
    @GetMapping
    public ResponseEntity<List<TeacherResponse>> getAll(
            @RequestParam(required = false) String year) {
        return ResponseEntity.ok(teacherService.getAll(year));
    }

    // GET /api/teachers/{id}
    @GetMapping("/{id}")
    public ResponseEntity<TeacherResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(teacherService.getById(id));
    }

    // POST /api/teachers
    @PostMapping
    public ResponseEntity<TeacherResponse> create(@Valid @RequestBody TeacherRequest request) {
        return ResponseEntity.ok(teacherService.create(request));
    }

    // PUT /api/teachers/{id}
    @PutMapping("/{id}")
    public ResponseEntity<TeacherResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody TeacherRequest request) {
        return ResponseEntity.ok(teacherService.update(id, request));
    }

    // DELETE /api/teachers/batch
    @DeleteMapping("/batch")
    public ResponseEntity<BatchDeleteCascadeResponse> deleteBatch(@RequestBody List<Long> ids) {
        return ResponseEntity.ok(teacherService.deleteBatch(ids));
    }
}
