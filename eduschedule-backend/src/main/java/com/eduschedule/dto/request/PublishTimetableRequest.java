package com.eduschedule.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class PublishTimetableRequest {
    private List<Long> weekIds;
}
