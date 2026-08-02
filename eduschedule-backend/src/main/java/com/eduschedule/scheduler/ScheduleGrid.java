package com.eduschedule.scheduler;

import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SpecialRoom;
import com.eduschedule.scheduler.model.SlotEntry;

import java.util.*;
import java.util.stream.Collectors;

public class ScheduleGrid {

    // Main grid: "classId_day_session_period" → Assignment
    private final Map<String, Assignment> grid = new HashMap<>();

    // classId → list of filled slot keys (used by SA to pick random slots per class)
    private final Map<Long, List<String>> classSlotsIndex = new HashMap<>();

    // "teacherId_day_session_period" → occupied
    private final Set<String> teacherOccupied = new HashSet<>();

    // "subjectId_day_session_period" → count (room conflict tracking)
    private final Map<String, Integer> roomUsage = new HashMap<>();

    // subjectId → SpecialRoom (read-only, shared across copies)
    private final Map<Long, SpecialRoom> subjectToRoom;

    // Keys for pre-existing slots that must not be moved by SA
    private final Set<String> lockedKeys = new HashSet<>();

    public ScheduleGrid(List<SpecialRoom> specialRooms) {
        this.subjectToRoom = specialRooms.stream()
                .filter(r -> r.getSubject() != null)
                .collect(Collectors.toMap(r -> r.getSubject().getId(), r -> r, (a, b) -> a));
    }

    // Deep copy constructor — used by SA to snapshot the best solution
    public ScheduleGrid(ScheduleGrid other) {
        this.grid.putAll(other.grid);
        other.classSlotsIndex.forEach((k, v) ->
                this.classSlotsIndex.put(k, new ArrayList<>(v)));
        this.teacherOccupied.addAll(other.teacherOccupied);
        this.roomUsage.putAll(other.roomUsage);
        this.subjectToRoom = other.subjectToRoom;
        this.lockedKeys.addAll(other.lockedKeys);
    }

    // --- Keys ---

    private String slotKey(long classId, int day, int session, int period) {
        return classId + "_" + day + "_" + session + "_" + period;
    }

    private String teacherKey(long teacherId, int day, int session, int period) {
        return teacherId + "_" + day + "_" + session + "_" + period;
    }

    private String roomKey(long subjectId, int day, int session, int period) {
        return subjectId + "_" + day + "_" + session + "_" + period;
    }

    // Returns [classId, day, session, period]
    private long[] parseKey(String key) {
        String[] parts = key.split("_");
        return new long[]{
                Long.parseLong(parts[0]),
                Long.parseLong(parts[1]),
                Long.parseLong(parts[2]),
                Long.parseLong(parts[3])
        };
    }

    // --- Session helpers ---

    public int periodsInSession(int session) {
        return session == 1 ? ScheduleConfig.PERIODS_MORNING : ScheduleConfig.PERIODS_AFTERNOON;
    }

    // Returns the next free period (1-based) in the session for a class, or -1 if full
    public int nextPeriodInSession(long classId, int day, int session) {
        int max = periodsInSession(session);
        for (int p = 1; p <= max; p++) {
            if (!grid.containsKey(slotKey(classId, day, session, p))) return p;
        }
        return -1;
    }

    public boolean hasTeacherInSession(long teacherId, int day, int session) {
        int max = periodsInSession(session);
        for (int p = 1; p <= max; p++) {
            if (teacherOccupied.contains(teacherKey(teacherId, day, session, p))) return true;
        }
        return false;
    }

    // --- Greedy placement (full constraint check including no-gap rule) ---

    public boolean canPlace(Assignment a, int day, int session, int period) {
        long classId = a.getSchoolClass().getId();
        long teacherId = a.getTeacher().getId();
        long subjectId = a.getSubject().getId();

        if (grid.containsKey(slotKey(classId, day, session, period))) return false;
        if (nextPeriodInSession(classId, day, session) != period) return false;
        if (teacherOccupied.contains(teacherKey(teacherId, day, session, period))) return false;

        SpecialRoom room = subjectToRoom.get(subjectId);
        if (room != null) {
            int used = roomUsage.getOrDefault(roomKey(subjectId, day, session, period), 0);
            return used < room.getQuantity();
        }

        return true;
    }

    public void place(Assignment a, int day, int session, int period) {
        long classId = a.getSchoolClass().getId();
        String key = slotKey(classId, day, session, period);

        grid.put(key, a);
        classSlotsIndex.computeIfAbsent(classId, k -> new ArrayList<>()).add(key);
        teacherOccupied.add(teacherKey(a.getTeacher().getId(), day, session, period));

        SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
        if (room != null) {
            roomUsage.merge(roomKey(a.getSubject().getId(), day, session, period), 1, Integer::sum);
        }
    }

    // Place a pre-existing slot as locked — bypasses the no-gap constraint and
    // marks the key so SA will never move it.
    public void placeLocked(Assignment a, int day, int session, int period) {
        long classId = a.getSchoolClass().getId();
        String key = slotKey(classId, day, session, period);

        grid.put(key, a);
        classSlotsIndex.computeIfAbsent(classId, k -> new ArrayList<>()).add(key);
        lockedKeys.add(key);

        if (a.getTeacher() != null) {
            teacherOccupied.add(teacherKey(a.getTeacher().getId(), day, session, period));
        }

        SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
        if (room != null) {
            roomUsage.merge(roomKey(a.getSubject().getId(), day, session, period), 1, Integer::sum);
        }
    }

    private void removeByKey(String key) {
        Assignment a = grid.remove(key);
        if (a == null) return;

        long[] pos = parseKey(key);
        long classId = pos[0];
        int day = (int) pos[1], session = (int) pos[2], period = (int) pos[3];

        List<String> keys = classSlotsIndex.get(classId);
        if (keys != null) keys.remove(key);

        if (a.getTeacher() != null) {
            teacherOccupied.remove(teacherKey(a.getTeacher().getId(), day, session, period));
        }

        SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
        if (room != null) {
            roomUsage.merge(roomKey(a.getSubject().getId(), day, session, period), -1, Integer::sum);
        }
    }

    // --- SA swap ---

    // Swaps assignments between two slots of the SAME class.
    // Locked slots are never moved.
    public boolean trySwap(String key1, String key2) {
        if (lockedKeys.contains(key1) || lockedKeys.contains(key2)) return false;

        long[] pos1 = parseKey(key1);
        long[] pos2 = parseKey(key2);

        if (pos1[0] != pos2[0]) return false;
        if (key1.equals(key2)) return false;

        Assignment a1 = grid.get(key1);
        Assignment a2 = grid.get(key2);
        if (a1 == null || a2 == null) return false;

        int day1 = (int) pos1[1], ses1 = (int) pos1[2], per1 = (int) pos1[3];
        int day2 = (int) pos2[1], ses2 = (int) pos2[2], per2 = (int) pos2[3];

        removeByKey(key1);
        removeByKey(key2);

        boolean valid = canSwapPlace(a1, day2, ses2, per2) && canSwapPlace(a2, day1, ses1, per1);

        if (valid) {
            place(a1, day2, ses2, per2);
            place(a2, day1, ses1, per1);
        } else {
            place(a1, day1, ses1, per1);
            place(a2, day2, ses2, per2);
        }

        return valid;
    }

    // Constraint check for SA swaps — skips no-gap (positions already exist in the grid)
    private boolean canSwapPlace(Assignment a, int day, int session, int period) {
        if (teacherOccupied.contains(teacherKey(a.getTeacher().getId(), day, session, period))) return false;

        SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
        if (room != null) {
            int used = roomUsage.getOrDefault(roomKey(a.getSubject().getId(), day, session, period), 0);
            return used < room.getQuantity();
        }

        return true;
    }

    // Only non-locked keys — SA should only swap freely-placed slots
    public List<String> getFilledKeysForClass(long classId) {
        List<String> all = classSlotsIndex.getOrDefault(classId, Collections.emptyList());
        if (lockedKeys.isEmpty()) return all;
        return all.stream().filter(k -> !lockedKeys.contains(k)).collect(Collectors.toList());
    }

    public Set<Long> getClassIds() {
        return classSlotsIndex.keySet();
    }

    // Whether this cell holds a pre-existing DB slot — used by TimefoldPhase to pin such
    // lessons so Local Search never moves them.
    public boolean isLocked(long classId, int day, int session, int period) {
        return lockedKeys.contains(slotKey(classId, day, session, period));
    }

    public int size() {
        return grid.size();
    }

    // --- Fitness ---

    public int computeFitness(Map<Long, Integer> teacherMaxPeriods, Long shlSubjectId) {
        int score = 0;
        score -= ScheduleConfig.W1 * countTeacherSessions();
        score -= ScheduleConfig.W2 * countSc2Violations();
        score -= ScheduleConfig.W3 * countSc3Violations();
        score -= ScheduleConfig.W4 * countSc4Violations(teacherMaxPeriods);
        score -= ScheduleConfig.W5 * countSc5Violations(teacherMaxPeriods);
        if (shlSubjectId != null) {
            score -= ScheduleConfig.W6 * countSc6Violations(shlSubjectId);
        }
        return score;
    }

    private int countTeacherSessions() {
        Set<String> sessions = new HashSet<>();
        for (Map.Entry<String, Assignment> e : grid.entrySet()) {
            if (e.getValue().getTeacher() == null) continue;
            long[] pos = parseKey(e.getKey());
            sessions.add(e.getValue().getTeacher().getId() + "_" + pos[1] + "_" + pos[2]);
        }
        return sessions.size();
    }

    private int countSc2Violations() {
        int violations = 0;
        for (long classId : classSlotsIndex.keySet()) {
            for (int day : ScheduleConfig.DAYS) {
                for (int ses = 1; ses <= 2; ses++) {
                    int max = periodsInSession(ses);
                    for (int p = 1; p <= max - 2; p++) {
                        Assignment a1 = grid.get(slotKey(classId, day, ses, p));
                        Assignment a2 = grid.get(slotKey(classId, day, ses, p + 1));
                        Assignment a3 = grid.get(slotKey(classId, day, ses, p + 2));
                        if (a1 != null && a2 != null && a3 != null
                                && a1.getSubject().getId().equals(a2.getSubject().getId())
                                && a2.getSubject().getId().equals(a3.getSubject().getId())) {
                            violations++;
                        }
                    }
                }
            }
        }
        return violations;
    }

    private int countSc3Violations() {
        int violations = 0;
        for (long classId : classSlotsIndex.keySet()) {
            for (int day : ScheduleConfig.DAYS) {
                Set<Long> morning = new HashSet<>(), afternoon = new HashSet<>();
                for (int p = 1; p <= periodsInSession(1); p++) {
                    Assignment a = grid.get(slotKey(classId, day, 1, p));
                    if (a != null) morning.add(a.getSubject().getId());
                }
                for (int p = 1; p <= periodsInSession(2); p++) {
                    Assignment a = grid.get(slotKey(classId, day, 2, p));
                    if (a != null) afternoon.add(a.getSubject().getId());
                }
                for (Long sid : morning) {
                    if (afternoon.contains(sid)) violations++;
                }
            }
        }
        return violations;
    }

    private int countSc4Violations(Map<Long, Integer> teacherMaxPeriods) {
        Set<Long> teacherIds = new HashSet<>();
        for (Assignment a : grid.values()) {
            if (a.getTeacher() != null) teacherIds.add(a.getTeacher().getId());
        }

        int violations = 0;
        for (long tid : teacherIds) {
            int maxConsec = teacherMaxPeriods.getOrDefault(tid, ScheduleConfig.MAX_CONSECUTIVE_TEACHER_PERIODS);
            for (int day : ScheduleConfig.DAYS) {
                int consec = 0;
                for (int ses = 1; ses <= 2; ses++) {
                    for (int p = 1; p <= periodsInSession(ses); p++) {
                        if (teacherOccupied.contains(teacherKey(tid, day, ses, p))) {
                            if (++consec > maxConsec) violations++;
                        } else {
                            consec = 0;
                        }
                    }
                }
            }
        }
        return violations;
    }

    private int countSc5Violations(Map<Long, Integer> teacherMaxPeriods) {
        Map<Long, Integer> count = new HashMap<>();
        for (Assignment a : grid.values()) {
            if (a.getTeacher() != null) count.merge(a.getTeacher().getId(), 1, Integer::sum);
        }

        int violations = 0;
        for (Map.Entry<Long, Integer> e : count.entrySet()) {
            int max = teacherMaxPeriods.getOrDefault(e.getKey(), Integer.MAX_VALUE);
            if (e.getValue() > max) violations++;
        }
        return violations;
    }

    private int countSc6Violations(Long shlSubjectId) {
        int lastPeriod = periodsInSession(2);
        int violations = 0;
        for (long classId : classSlotsIndex.keySet()) {
            Assignment a = grid.get(slotKey(classId, 6, 2, lastPeriod));
            if (a == null || !shlSubjectId.equals(a.getSubject().getId())) violations++;
        }
        return violations;
    }

    // --- Output ---

    public List<SlotEntry> toSlotEntries() {
        List<SlotEntry> result = new ArrayList<>();
        for (Map.Entry<String, Assignment> e : grid.entrySet()) {
            long[] pos = parseKey(e.getKey());
            Assignment a = e.getValue();
            SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
            result.add(new SlotEntry(a, (int) pos[1], (int) pos[2], (int) pos[3], room));
        }
        return result;
    }

    // Only non-locked entries — the new slots generated this run
    public List<SlotEntry> toNewSlotEntries() {
        List<SlotEntry> result = new ArrayList<>();
        for (Map.Entry<String, Assignment> e : grid.entrySet()) {
            if (lockedKeys.contains(e.getKey())) continue;
            long[] pos = parseKey(e.getKey());
            Assignment a = e.getValue();
            SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
            result.add(new SlotEntry(a, (int) pos[1], (int) pos[2], (int) pos[3], room));
        }
        return result;
    }
}
