package com.eduschedule.scheduler;

import com.eduschedule.entity.Assignment;

import java.util.*;

class GreedyPhase {

    private final Random random = new Random();

    ScheduleGrid run(List<Assignment> assignments,
                     Map<Long, Integer> periodsMap,
                     ScheduleGrid grid,
                     List<String> errors) {

        placeGroup(grid, expandAndShuffle(assignments, periodsMap), errors);

        return grid;
    }

    private List<Assignment> expandAndShuffle(List<Assignment> assignments, Map<Long, Integer> periodsMap) {
        List<Assignment> requirements = new ArrayList<>();
        for (Assignment a : assignments) {
            int periods = periodsMap.getOrDefault(a.getId(), 0);
            for (int i = 0; i < periods; i++) requirements.add(a);
        }
        Collections.shuffle(requirements, random);
        return requirements;
    }

    private void placeGroup(ScheduleGrid grid, List<Assignment> requirements, List<String> errors) {
        for (Assignment req : requirements) {
            if (!tryPlace(grid, req)) {
                errors.add("Không thể xếp: lớp %s — %s (%s)".formatted(
                        req.getSchoolClass().getName(),
                        req.getSubject().getName(),
                        req.getTeacher().getFullName()));
            }
        }
    }

    private boolean tryPlace(ScheduleGrid grid, Assignment a) {
        long teacherId = a.getTeacher().getId();
        long classId = a.getSchoolClass().getId();

        // Preferred: sessions where this teacher already has a slot (cluster sessions → fewer days)
        List<int[]> preferred = new ArrayList<>();
        List<int[]> fallback = new ArrayList<>();

        for (int day : ScheduleConfig.DAYS) {
            for (int ses = 1; ses <= 2; ses++) {
                int nextPeriod = grid.nextPeriodInSession(classId, day, ses);
                if (nextPeriod == -1) continue; // session full for this class

                if (grid.canPlace(a, day, ses, nextPeriod)) {
                    int[] pos = {day, ses, nextPeriod};
                    if (grid.hasTeacherInSession(teacherId, day, ses)) {
                        preferred.add(pos);
                    } else {
                        fallback.add(pos);
                    }
                }
            }
        }

        if (preferred.isEmpty() && fallback.isEmpty()) return false;

        List<int[]> choices = preferred.isEmpty() ? fallback : preferred;
        int[] pos = choices.get(random.nextInt(choices.size()));
        grid.place(a, pos[0], pos[1], pos[2]);
        return true;
    }
}
