package com.eduschedule.scheduler;

public final class ScheduleConfig {
    public static final int[] DAYS = {2, 3, 4, 5, 6};
    public static final int PERIODS_MORNING = 4;
    public static final int PERIODS_AFTERNOON = 3;

    // Soft constraint weights
    public static final int W2 = 3;  // SC2: no 3 consecutive same subject in session

    private ScheduleConfig() {
    }
}
