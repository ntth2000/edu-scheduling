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

    // Luôn trả 200 kể cả khi result.errors không rỗng — xếp tự động một phần vẫn là kết quả hợp lệ
    // (client hiển thị các tiết xếp được + số tiết xếp được/tổng số tiết, không coi là lỗi request).
    @PostMapping("/{weekId}/generate")
    public ResponseEntity<AutoScheduleResult> generate(@PathVariable Long weekId) {
        return ResponseEntity.ok(generatorService.generate(weekId));
    }
}
