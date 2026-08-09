package com.eduschedule.scheduler.solver;

import java.util.Comparator;

// Decides the order in which the Construction Heuristic assigns lessons.
//
// The contract of @PlanningEntity(comparatorClass) is to sort ASCENDING (easiest first). The
// default construction heuristic (ALLOCATE_ENTITY_FROM_QUEUE) uses EntitySorterManner
// .DESCENDING_IF_AVAILABLE, so it walks this ordering backwards and places the hardest lesson
// first — while the timetable is still empty and every timeslot is available.
//
// Placing hardest-first matters in a primary school: a "giáo viên bộ môn" (GVBM) teaches the same
// subject across many classes, so their lessons compete with each other for the same few timeslots,
// and the special rooms those subjects need are shared school-wide. A homeroom teacher (GVCN)
// teaches many subjects but only their own class, so their lessons only ever compete within that
// one class and stay easy to place until the very end.
//
// Resulting placement order, hardest first:
//   1. Pinned lessons          — already have a timeslot; the CH never touches them (see below).
//   2. Taught by a GVBM and needs a special room (limited quantity shared by all classes).
//   3. Taught by a GVBM and needs no special room.
//   4. Taught by the class's own homeroom teacher — the most flexible, placed last.
//
// Note on 1: pinned entities are excluded from the construction heuristic queue entirely because
// they already hold a value, so their rank here never actually decides anything. It is kept so the
// ordering reads the same way as the rule it implements.
public class LessonDifficultyComparator implements Comparator<Lesson> {

    @Override
    public int compare(Lesson a, Lesson b) {
        int byTier = Integer.compare(tier(a), tier(b));
        if (byTier != 0) return byTier;

        // Within the same tier, a teacher covering more classes is still the harder one to place.
        int byClassCount = Integer.compare(a.getTeacherClassCount(), b.getTeacherClassCount());
        if (byClassCount != 0) return byClassCount;

        // A scarcer special room is harder to fit than a plentiful one.
        int byRoomScarcity = Integer.compare(roomCapacity(b), roomCapacity(a));
        if (byRoomScarcity != 0) return byRoomScarcity;

        // Final tie-break so the ordering is fully deterministic between runs.
        return a.getId().compareTo(b.getId());
    }

    // Higher tier = harder to place = assigned earlier by the construction heuristic.
    private int tier(Lesson lesson) {
        if (lesson.isPinned()) return 3;
        // A GVCN lesson is the most flexible one regardless of the room it needs, so it always
        // lands in the last tier; the two GVBM tiers are split by whether a special room is needed.
        if (lesson.isHomeroomTeacher()) return 0;
        return lesson.getSpecialRoomId() != null ? 2 : 1;
    }

    // Lessons with no special room are unconstrained on rooms; treat them as unlimited.
    private int roomCapacity(Lesson lesson) {
        if (lesson.getSpecialRoomId() == null || lesson.getSpecialRoomCapacity() == null) {
            return Integer.MAX_VALUE;
        }
        return lesson.getSpecialRoomCapacity();
    }
}
