package com.eduschedule.controller;

import com.eduschedule.dto.request.SlotRequest;
import com.eduschedule.dto.response.SlotResponse;
import com.eduschedule.service.SlotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/slots")
@RequiredArgsConstructor
public class SlotController {
    private final SlotService slotService;

    @GetMapping
    public ResponseEntity<List<SlotResponse>> getAll(@RequestParam(required = false) Long timetableId) {
        if (timetableId != null) {
            return ResponseEntity.ok(slotService.getByTimetable(timetableId));
        }
        return ResponseEntity.ok(slotService.getAll());
    }

    @PostMapping
    public ResponseEntity<SlotResponse> save(@Valid @RequestBody SlotRequest request) {
        return ResponseEntity.ok(slotService.saveOrUpdateSlot(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        slotService.deleteSlot(id);
        return ResponseEntity.noContent().build();
    }
}
