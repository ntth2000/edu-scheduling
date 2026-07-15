package com.eduschedule.scheduler.solver;

import ai.timefold.solver.core.api.score.HardSoftScore;
import ai.timefold.solver.core.api.score.stream.*;
import com.eduschedule.scheduler.ScheduleConfig;

// Rules here mirror the checks that used to live in ScheduleGrid.canPlace() (hard)
// and ScheduleGrid.computeFitness() / SC1-SC6 (soft, weights in ScheduleConfig).
public class TimetableConstraintProvider implements ConstraintProvider {

    @Override
    public Constraint[] defineConstraints(ConstraintFactory factory) {
        return new Constraint[]{
                classConflict(factory),
                teacherConflict(factory),
                specialRoomCapacity(factory),
                noGapWithinSession(factory),
                minimizeTeacherSessions(factory),
                noThreeConsecutiveSameSubject(factory),
//                noSameSubjectMorningAndAfternoon(factory),
//                teacherMaxConsecutivePeriods(factory),
//                teacherWeeklyLimit(factory),
                afternoonRequiresCompleteMorningSession(factory)
        };
    }

    // --- Hard constraints ---

    //HC1: Same class can't have two lessons in the same timeslot (was: grid.containsKey(slotKey)).
    private Constraint classConflict(ConstraintFactory factory) {
        return factory.forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getClassId),
                        Joiners.equal(Lesson::getTimeslot))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Class conflict");
    }

    //HC2: Same teacher can't teach two lessons in the same timeslot (was: teacherOccupied set).
    private Constraint teacherConflict(ConstraintFactory factory) {
        return factory.forEachUniquePair(Lesson.class,
                        Joiners.equal(Lesson::getTeacherId),
                        Joiners.equal(Lesson::getTimeslot))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("Teacher conflict");
    }

    //HC3: A special room (e.g. lab) can only host as many concurrent lessons as its quantity
    // (was: roomUsage map compared against SpecialRoom.quantity in canPlace()).
    private Constraint specialRoomCapacity(ConstraintFactory factory) {
        return factory.forEach(Lesson.class)
                .filter(lesson -> lesson.getSpecialRoomId() != null)
                .groupBy(Lesson::getSpecialRoomId, Lesson::getTimeslot, ConstraintCollectors.toList())
                .filter((roomId, timeslot, lessons) -> lessons.size() > lessons.get(0).getSpecialRoomCapacity())
                .penalize(HardSoftScore.ONE_HARD,
                        (roomId, timeslot, lessons) -> lessons.size() - lessons.get(0).getSpecialRoomCapacity())
                .asConstraint("Special room capacity");
    }

    //HC4: A class's periods within a session must be contiguous from period 1, no empty period
    // in between (was: ScheduleGrid.nextPeriodInSession() enforcing front-to-back placement).
    private Constraint noGapWithinSession(ConstraintFactory factory) {
        return factory.forEach(Lesson.class)
                .filter(lesson -> lesson.getTimeslot().getPeriod() > 1)
                .ifNotExists(Lesson.class,
                        Joiners.equal(Lesson::getClassId, Lesson::getClassId),
                        Joiners.equal(l -> l.getTimeslot().getDay(), l2 -> l2.getTimeslot().getDay()),
                        Joiners.equal(l -> l.getTimeslot().getSession(), l2 -> l2.getTimeslot().getSession()),
                        Joiners.equal(l -> l.getTimeslot().getPeriod() - 1, l2 -> l2.getTimeslot().getPeriod()))
                .penalize(HardSoftScore.ONE_HARD)
                .asConstraint("No gap within session");
    }

    //HC5: If a class has any afternoon lesson on a given day,
    // all 4 morning periods of that day must be occupied.
    private Constraint afternoonRequiresCompleteMorningSession(
            ConstraintFactory factory
    ) {
        return factory.forEach(Lesson.class)
                .filter(lesson -> lesson.getTimeslot() != null)
                .groupBy(
                        Lesson::getClassId,
                        lesson -> lesson.getTimeslot().getDay(),
                        ConstraintCollectors.toList()
                )
                .filter((classId, day, lessons) -> {
                    boolean hasAfternoonLesson = lessons.stream()
                            .anyMatch(lesson ->
                                    lesson.getTimeslot().getSession() == 2
                            );

                    long occupiedMorningPeriods = lessons.stream()
                            .filter(lesson ->
                                    lesson.getTimeslot().getSession() == 1
                            )
                            .map(lesson ->
                                    lesson.getTimeslot().getPeriod()
                            )
                            .distinct()
                            .count();

                    return hasAfternoonLesson
                            && occupiedMorningPeriods < 4;
                })
                .penalize(
                        HardSoftScore.ONE_HARD,
                        (classId, day, lessons) -> {
                            long occupiedMorningPeriods = lessons.stream()
                                    .filter(lesson ->
                                            lesson.getTimeslot().getSession() == 1
                                    )
                                    .map(lesson ->
                                            lesson.getTimeslot().getPeriod()
                                    )
                                    .distinct()
                                    .count();

                            return Math.toIntExact(
                                    4 - occupiedMorningPeriods
                            );
                        }
                )
                .asConstraint(
                        "Afternoon requires complete morning session"
                );
    }

    // --- Soft constraints (SC1-SC5, weights from ScheduleConfig) ---

    // SC1: minimize the number of distinct (teacher, day, session) groups a teacher is split across.
    private Constraint minimizeTeacherSessions(ConstraintFactory factory) {
        return factory.forEach(Lesson.class)
                .groupBy(Lesson::getTeacherId, l -> l.getTimeslot().getDay(), l -> l.getTimeslot().getSession())
                .penalize(HardSoftScore.ofSoft(ScheduleConfig.W1))
                .asConstraint("Minimize teacher sessions");
    }

    // SC2: no 3 consecutive periods of the same subject, same class, same session.
    private Constraint noThreeConsecutiveSameSubject(ConstraintFactory factory) {
        return factory.forEach(Lesson.class)
                .join(Lesson.class,
                        Joiners.equal(Lesson::getClassId, Lesson::getClassId),
                        Joiners.equal(l -> l.getTimeslot().getDay(), l2 -> l2.getTimeslot().getDay()),
                        Joiners.equal(l -> l.getTimeslot().getSession(), l2 -> l2.getTimeslot().getSession()),
                        Joiners.equal(l -> l.getTimeslot().getPeriod() + 1, l2 -> l2.getTimeslot().getPeriod()))
                .filter((l1, l2) -> l1.getSubjectId().equals(l2.getSubjectId()))
                .join(Lesson.class,
                        Joiners.equal((l1, l2) -> l1.getClassId(), Lesson::getClassId),
                        Joiners.equal((l1, l2) -> l1.getTimeslot().getDay(), l3 -> l3.getTimeslot().getDay()),
                        Joiners.equal((l1, l2) -> l1.getTimeslot().getSession(), l3 -> l3.getTimeslot().getSession()),
                        Joiners.equal((l1, l2) -> l1.getTimeslot().getPeriod() + 2, l3 -> l3.getTimeslot().getPeriod()))
                .filter((l1, l2, l3) -> l1.getSubjectId().equals(l3.getSubjectId()))
                .penalize(HardSoftScore.ofSoft(ScheduleConfig.W2))
                .asConstraint("No 3 consecutive same subject");
    }

//    // SC3: same class shouldn't have the same subject both in the morning and the afternoon of one day.
//    private Constraint noSameSubjectMorningAndAfternoon(ConstraintFactory factory) {
//        return factory.forEach(Lesson.class)
//                .filter(l -> l.getTimeslot().getSession() == 1)
//                .join(factory.forEach(Lesson.class).filter(l -> l.getTimeslot().getSession() == 2),
//                        Joiners.equal(Lesson::getClassId, Lesson::getClassId),
//                        Joiners.equal(l -> l.getTimeslot().getDay(), l2 -> l2.getTimeslot().getDay()),
//                        Joiners.equal(Lesson::getSubjectId, Lesson::getSubjectId))
//                // collapse back to one match per (class, day, subject) — matches the original
//                // Set-based check instead of penalizing once per morning/afternoon period pair.
//                .groupBy((l1, l2) -> l1.getClassId(), (l1, l2) -> l1.getTimeslot().getDay(), (l1, l2) -> l1.getSubjectId())
//                .penalize(HardSoftScore.ofSoft(ScheduleConfig.W3))
//                .asConstraint("No same subject morning and afternoon");
//    }

    // SC4: a teacher shouldn't teach more than MAX_CONSECUTIVE_TEACHER_PERIODS periods in a row in one day
    // (morning+afternoon treated as one continuous run, via Timeslot.getFlatPeriod()).
    // Fires once for every period beyond the limit, same as the original consec-counter loop.
//    private Constraint teacherMaxConsecutivePeriods(ConstraintFactory factory) {
//        var stream = factory.forEach(Lesson.class);
//        for (int offset = 1; offset <= ScheduleConfig.MAX_CONSECUTIVE_TEACHER_PERIODS; offset++) {
//            final int o = offset;
//            stream = stream.ifExists(Lesson.class,
//                    Joiners.equal(Lesson::getTeacherId, Lesson::getTeacherId),
//                    Joiners.equal(l -> l.getTimeslot().getDay(), l2 -> l2.getTimeslot().getDay()),
//                    Joiners.equal(l -> l.getTimeslot().getFlatPeriod() - o, l2 -> l2.getTimeslot().getFlatPeriod()));
//        }
//        return stream
//                .penalize(HardSoftScore.ofSoft(ScheduleConfig.W4))
//                .asConstraint("Teacher max consecutive periods");
//    }

    // SC5: a teacher shouldn't be scheduled beyond their Teacher.maxPeriodsPerWeek.
//    private Constraint teacherWeeklyLimit(ConstraintFactory factory) {
//        return factory.forEach(Lesson.class)
//                .groupBy(Lesson::getTeacherId, ConstraintCollectors.toList())
//                .filter((teacherId, lessons) -> {
//                    Integer max = lessons.get(0).getTeacherMaxPeriodsPerWeek();
//                    return max != null && lessons.size() > max;
//                })
//                .penalize(HardSoftScore.ofSoft(ScheduleConfig.W5))
//                .asConstraint("Teacher weekly period limit");
//    }
}
