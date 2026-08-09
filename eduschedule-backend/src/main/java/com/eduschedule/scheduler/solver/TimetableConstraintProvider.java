package com.eduschedule.scheduler.solver;

import ai.timefold.solver.core.api.score.HardSoftScore;
import ai.timefold.solver.core.api.score.stream.*;
import com.eduschedule.scheduler.ScheduleConfig;

public class TimetableConstraintProvider implements ConstraintProvider {

    @Override
    public Constraint[] defineConstraints(ConstraintFactory factory) {
        return new Constraint[]{
                classConflict(factory),
                teacherConflict(factory),
                specialRoomCapacity(factory),
                noGapWithinSession(factory),
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
    // in between.
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
}
