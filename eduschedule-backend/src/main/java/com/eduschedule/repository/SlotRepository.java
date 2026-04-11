package com.eduschedule.repository;

import com.eduschedule.entity.Slot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SlotRepository extends JpaRepository<Slot, Long> {
    List<Slot> findByTimetableId(Long timetableId);
    Optional<Slot> findByTimetableIdAndDayAndPeriod(Long timetableId, Integer day, Integer period);
    boolean existsByTimetableIdAndDayAndPeriodAndAssignment_Teacher_IdAndIdNot(
            Long timetableId, Integer day, Integer period, Long teacherId, Long excludeSlotId);
}
