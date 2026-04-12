package com.eduschedule.controller;

import com.eduschedule.dto.request.ClassRequest;
import com.eduschedule.dto.response.ClassResponse;
import com.eduschedule.service.SchoolClassService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class SchoolClassController {
    private final SchoolClassService classService;

    // GET /api/classes
    @GetMapping
    public ResponseEntity<List<ClassResponse>> getAll() {
        return ResponseEntity.ok(classService.getAll());
    }

    // GET /api/classes/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ClassResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(classService.getById(id));
    }

    // POST /api/classes
    @PostMapping
    public ResponseEntity<ClassResponse> create(@Valid @RequestBody ClassRequest request) {
        return ResponseEntity.ok(classService.create(request));
    }

    // PUT /api/classes/{id}
    @PutMapping("/{id}")
    public ResponseEntity<ClassResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ClassRequest request) {
        return ResponseEntity.ok(classService.update(id, request));
    }

    // DELETE /api/classes/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        classService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // DELETE /api/classes/batch
    @DeleteMapping("/batch")
    public ResponseEntity<Void> deleteBatch(@RequestBody List<Long> ids) {
        classService.deleteBatch(ids);
        return ResponseEntity.noContent().build();
    }
}
