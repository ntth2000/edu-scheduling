package com.eduschedule.repository;

import com.eduschedule.entity.Slot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SlotRepository extends JpaRepository<Slot, Long> {
    List<Slot> findByWeekId(Long weekId);

    Optional<Slot> findByWeekIdAndDayAndSessionAndPeriodAndAssignment_SchoolClassId(
            Long weekId, Integer day, Integer session, Integer period, Long classId);

    boolean existsByWeekIdAndDayAndSessionAndPeriodAndAssignment_Teacher_IdAndIdNot(
            Long weekId, Integer day, Integer session, Integer period, Long teacherId, Long excludeSlotId);

    List<Slot> findByAssignment_TeacherId(Long teacherId);

    boolean existsByWeek_Timetable_SchoolYearId(Long schoolYearId);

    @Modifying
    @Query("DELETE FROM Slot s WHERE s.assignment.teacher.id = :teacherId")
    void deleteByAssignment_TeacherId(@Param("teacherId") Long teacherId);

    @Modifying
    @Query("DELETE FROM Slot s WHERE s.assignment.id IN :ids")
    void deleteByAssignmentIdIn(@Param("ids") List<Long> ids);

    @Modifying
    @Query("DELETE FROM Slot s WHERE s.week.id IN :weekIds")
    void deleteByWeekIdIn(@Param("weekIds") List<Long> weekIds);

    @Modifying
    @Query("DELETE FROM Slot s WHERE s.assignment.teacher.id = :teacherId AND s.week.timetable.id = :timetableId AND s.week.weekNumber >= :fromWeekNumber")
    void deleteByTeacherFromWeek(@Param("teacherId") Long teacherId,
                                 @Param("timetableId") Long timetableId,
                                 @Param("fromWeekNumber") Integer fromWeekNumber);
}
