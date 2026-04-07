package com.eduschedule.repository;

import com.eduschedule.entity.SchoolOffPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolOffPeriodRepository
        extends JpaRepository<SchoolOffPeriod, Long> {

    List<SchoolOffPeriod> findByDay(Integer day);

    boolean existsByDayAndPeriod(Integer day, Integer period);

    void deleteByDayAndPeriod(Integer day, Integer period);
}