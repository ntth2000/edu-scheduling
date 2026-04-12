package com.eduschedule.controller;

import com.eduschedule.dto.request.SubjectRequest;
import com.eduschedule.dto.response.SubjectResponse;
import com.eduschedule.service.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {
    private final SubjectService subjectService;

    // GET /api/subjects
    @GetMapping
    public ResponseEntity<List<SubjectResponse>> getAll() {
        return ResponseEntity.ok(subjectService.getAll());
    }

    // GET /api/subjects/{id}
    @GetMapping("/{id}")
    public ResponseEntity<SubjectResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(subjectService.getById(id));
    }

    // POST /api/subjects
    @PostMapping
    public ResponseEntity<SubjectResponse> create(@Valid @RequestBody SubjectRequest request) {
        return ResponseEntity.ok(subjectService.create(request));
    }

    // PUT /api/subjects/{id}
    @PutMapping("/{id}")
    public ResponseEntity<SubjectResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SubjectRequest request) {
        return ResponseEntity.ok(subjectService.update(id, request));
    }

    // DELETE /api/subjects/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        subjectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // DELETE /api/subjects/batch
    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody List<Long> ids) {
        subjectService.deleteBatch(ids);
        return ResponseEntity.noContent().build();
    }
}
