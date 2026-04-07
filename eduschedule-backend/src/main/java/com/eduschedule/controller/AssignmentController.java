package com.eduschedule.controller;

import com.eduschedule.dto.request.AssignmentRequest;
import com.eduschedule.dto.request.HomeroomAssignmentRequest;
import com.eduschedule.dto.response.AssignmentResponse;
import com.eduschedule.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    // GET /api/assignments?classId=1
    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> getAll(
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) Long teacherId
    ) {
        if (classId != null) {
            return ResponseEntity.ok(
                    assignmentService.getByClass(classId)
            );
        }
        if (teacherId != null) {
            return ResponseEntity.ok(
                    assignmentService.getByTeacher(teacherId)
            );
        }
        return ResponseEntity.ok(List.of());
    }

    // POST /api/assignments/homeroom
    // Phân công GVCN cho lớp
    @PostMapping("/homeroom")
    public ResponseEntity<Void> assignHomeroom(
            @Valid @RequestBody HomeroomAssignmentRequest request
    ) {
        assignmentService.assignHomeroom(request);
        return ResponseEntity.ok().build();
    }

    // POST /api/assignments
    // Phân công GV bộ môn
    @PostMapping
    public ResponseEntity<AssignmentResponse> assign(
            @Valid @RequestBody AssignmentRequest request
    ) {
        return ResponseEntity.ok(
                assignmentService.assign(request)
        );
    }

    // DELETE /api/assignments/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id
    ) {
        assignmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}