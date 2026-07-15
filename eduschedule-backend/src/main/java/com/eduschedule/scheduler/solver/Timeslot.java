package com.eduschedule.scheduler.solver;

import com.eduschedule.scheduler.ScheduleConfig;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

// Problem fact: one concrete (day, session, period) cell in the weekly grid.
public class Timeslot {

    private int day;     // ScheduleConfig.DAYS entry, e.g. 2=Mon .. 6=Fri
    private int session; // 1 = morning, 2 = afternoon
    private int period;  // 1-based within the session

    public Timeslot() {
    }

    public Timeslot(int day, int session, int period) {
        this.day = day;
        this.session = session;
        this.period = period;
    }

    public static List<Timeslot> generateAll() {
        List<Timeslot> timeslots = new ArrayList<>();
        for (int day : ScheduleConfig.DAYS) {
            for (int p = 1; p <= ScheduleConfig.PERIODS_MORNING; p++) {
                timeslots.add(new Timeslot(day, 1, p));
            }
            for (int p = 1; p <= ScheduleConfig.PERIODS_AFTERNOON; p++) {
                timeslots.add(new Timeslot(day, 2, p));
            }
        }
        return timeslots;
    }

    public int getDay() {
        return day;
    }

    public void setDay(int day) {
        this.day = day;
    }

    public int getSession() {
        return session;
    }

    public void setSession(int session) {
        this.session = session;
    }

    public int getPeriod() {
        return period;
    }

    public void setPeriod(int period) {
        this.period = period;
    }

    // 1-7 across the whole day, session 1 first — matches the frontend's flat period convention
    // and lets "consecutive periods" constraints treat morning+afternoon as one continuous run.
    public int getFlatPeriod() {
        return session == 1 ? period : period + ScheduleConfig.PERIODS_MORNING;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Timeslot other)) return false;
        return day == other.day && session == other.session && period == other.period;
    }

    @Override
    public int hashCode() {
        return Objects.hash(day, session, period);
    }

    @Override
    public String toString() {
        return "day%d-ses%d-p%d".formatted(day, session, period);
    }
}
