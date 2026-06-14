package com.eduschedule.repository;

import com.eduschedule.entity.Week;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WeekRepository extends JpaRepository<Week, Long> {
    List<Week> findByTimetableIdOrderByWeekNumber(Long timetableId);

    List<Week> findByTimetableIdAndWeekNumberGreaterThanEqualOrderByWeekNumber(Long timetableId, Integer weekNumber);
}
