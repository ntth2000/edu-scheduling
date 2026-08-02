package com.eduschedule.scheduler.model;

import java.util.List;

public record GenerateResult(
        List<SlotEntry> slots,
        List<String> errors
) {
    public boolean isSuccess() {
        return errors.isEmpty();
    }
}
