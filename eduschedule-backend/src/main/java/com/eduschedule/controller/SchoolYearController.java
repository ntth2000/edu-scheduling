package com.eduschedule.controller;

import com.eduschedule.dto.request.SchoolYearRequest;
import com.eduschedule.dto.response.SchoolYearResponse;
import com.eduschedule.service.SchoolYearService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/school-years")
@RequiredArgsConstructor
public class SchoolYearController {

    private final SchoolYearService schoolYearService;

    @GetMapping
    public ResponseEntity<List<SchoolYearResponse>> getAll() {
        return ResponseEntity.ok(schoolYearService.getAll(currentUsername()));
    }

    @PostMapping
    public ResponseEntity<SchoolYearResponse> create(@Valid @RequestBody SchoolYearRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(schoolYearService.create(request, currentUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        schoolYearService.delete(id, currentUsername());
        return ResponseEntity.noContent().build();
    }

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
