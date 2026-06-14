package com.eduschedule.repository;

import com.eduschedule.entity.Slot;
import org.springframework.data.jpa.repository.JpaRepository;
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

    void deleteByAssignment_TeacherId(Long teacherId);

    void deleteByAssignmentIdIn(List<Long> assignmentIds);

    void deleteByWeekIdIn(List<Long> weekIds);
}
