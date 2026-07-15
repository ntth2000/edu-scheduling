package com.eduschedule.scheduler;

public final class ScheduleConfig {
    public static final int[] DAYS = {2, 3, 4, 5, 6};
    public static final int PERIODS_MORNING = 4;
    public static final int PERIODS_AFTERNOON = 3;
    public static final int MAX_GREEDY_ATTEMPTS = 20;
    // Simulated Annealing parameters
    public static final double T_INIT = 100.0;
    public static final double T_MIN = 0.1;
    public static final double ALPHA = 0.995;
    public static final int ITER_PER_T = 200;
    // Soft constraint weights
    public static final int W1 = 10; // SC1: minimize teacher sessions
    public static final int W2 = 3;  // SC2: no 3 consecutive same subject in session
    public static final int W3 = 2;  // SC3: no same subject morning + afternoon same day
    public static final int W4 = 3;  // SC4: teacher max consecutive periods
    public static final int W5 = 2;  // SC5: teacher within weekly limit
    public static final int W6 = 5;  // SC6: last Friday afternoon = SHL
//    public static final int MAX_CONSECUTIVE_TEACHER_PERIODS = 4;

    private ScheduleConfig() {
    }
}
