package com.eduschedule.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class PublishTimetableRequest {
    // Danh sách rỗng hợp lệ — nghĩa là thu hồi công khai toàn bộ (xem TimetableService.publish).
    private List<Long> weekIds;
}
