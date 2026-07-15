package com.eduschedule.scheduler.model;

import java.util.List;

public record AutoScheduleResult(
        List<AutoScheduleSlot> slots,
        List<String> errors
) {
    public boolean isSuccess() {
        return errors.isEmpty();
    }
}
