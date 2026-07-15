package com.eduschedule.scheduler;

import com.eduschedule.scheduler.model.AutoScheduleResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weeks")
@RequiredArgsConstructor
public class ScheduleGeneratorController {

    private final ScheduleGeneratorService generatorService;

    @PostMapping("/{weekId}/generate")
    public ResponseEntity<AutoScheduleResult> generate(@PathVariable Long weekId) {
        AutoScheduleResult result = generatorService.generate(weekId);
        if (result.isSuccess()) {
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.badRequest().body(result);
    }
}
