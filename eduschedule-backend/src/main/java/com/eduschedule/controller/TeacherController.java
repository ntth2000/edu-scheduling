package com.eduschedule.controller;

import com.eduschedule.dto.request.TeacherRequest;
import com.eduschedule.dto.response.BatchDeleteCascadeResponse;
import com.eduschedule.dto.response.TeacherCascadeResponse;
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
    @GetMapping
    public ResponseEntity<List<TeacherResponse>> getAll() {
        return ResponseEntity.ok(teacherService.getAll());
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

    // PATCH /api/teachers/{id}/toggle-status
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<TeacherCascadeResponse> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(teacherService.toggleStatus(id));
    }

    // DELETE /api/teachers/batch
    @DeleteMapping("/batch")
    public ResponseEntity<BatchDeleteCascadeResponse> deleteBatch(@RequestBody List<Long> ids) {
        return ResponseEntity.ok(teacherService.deleteBatch(ids));
    }
}
