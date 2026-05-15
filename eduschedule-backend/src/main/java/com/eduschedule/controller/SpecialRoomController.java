package com.eduschedule.controller;

import com.eduschedule.dto.request.SpecialRoomRequest;
import com.eduschedule.dto.response.SpecialRoomResponse;
import com.eduschedule.service.SpecialRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/special-rooms")
@RequiredArgsConstructor
public class SpecialRoomController {
    private final SpecialRoomService specialRoomService;

    @GetMapping
    public ResponseEntity<List<SpecialRoomResponse>> getAll() {
        return ResponseEntity.ok(specialRoomService.getAll());
    }

    @PostMapping
    public ResponseEntity<SpecialRoomResponse> create(@Valid @RequestBody SpecialRoomRequest request) {
        return ResponseEntity.ok(specialRoomService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SpecialRoomResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SpecialRoomRequest request) {
        return ResponseEntity.ok(specialRoomService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        specialRoomService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
