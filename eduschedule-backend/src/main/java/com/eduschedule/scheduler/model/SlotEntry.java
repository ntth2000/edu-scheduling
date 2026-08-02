package com.eduschedule.scheduler.model;

import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SpecialRoom;

public record SlotEntry(
        Assignment assignment,
        int day,
        int session,
        int period,
        SpecialRoom specialRoom
) {}
