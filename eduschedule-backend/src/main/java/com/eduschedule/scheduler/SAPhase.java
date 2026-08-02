package com.eduschedule.scheduler;

import java.util.*;

class SAPhase {

    ScheduleGrid run(ScheduleGrid initial,
                     Map<Long, Integer> teacherMaxPeriods,
                     Long shlSubjectId) {

        ScheduleGrid current = new ScheduleGrid(initial);
        ScheduleGrid best = new ScheduleGrid(initial);
        int currentFitness = current.computeFitness(teacherMaxPeriods, shlSubjectId);
        int bestFitness = currentFitness;

        Random random = new Random();
        List<Long> classIds = new ArrayList<>(current.getClassIds());
        double T = ScheduleConfig.T_INIT;

        while (T > ScheduleConfig.T_MIN) {
            for (int i = 0; i < ScheduleConfig.ITER_PER_T; i++) {
                if (classIds.isEmpty()) break;

                long classId = classIds.get(random.nextInt(classIds.size()));

                // Defensive copy: trySwap mutates the internal classSlotsIndex list
                List<String> keys = new ArrayList<>(current.getFilledKeysForClass(classId));
                if (keys.size() < 2) continue;

                int idx1 = random.nextInt(keys.size());
                int idx2;
                do { idx2 = random.nextInt(keys.size()); } while (idx2 == idx1);

                String key1 = keys.get(idx1);
                String key2 = keys.get(idx2);

                if (!current.trySwap(key1, key2)) continue;

                int newFitness = current.computeFitness(teacherMaxPeriods, shlSubjectId);
                int delta = newFitness - currentFitness;

                if (delta >= 0 || random.nextDouble() < Math.exp((double) delta / T)) {
                    currentFitness = newFitness;
                    if (newFitness > bestFitness) {
                        best = new ScheduleGrid(current);
                        bestFitness = newFitness;
                    }
                } else {
                    // Reject: undo the swap (swapping same positions again restores original)
                    current.trySwap(key1, key2);
                }
            }
            T *= ScheduleConfig.ALPHA;
        }

        return best;
    }
}
