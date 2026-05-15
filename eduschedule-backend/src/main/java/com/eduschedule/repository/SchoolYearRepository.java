package com.eduschedule.repository;

import com.eduschedule.entity.SchoolYear;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolYearRepository extends JpaRepository<SchoolYear, Long> {
    List<SchoolYear> findAllByUserIdOrderByStartYearDesc(Long userId);
    boolean existsByStartYearAndUserId(Integer startYear, Long userId);
    Optional<SchoolYear> findByStartYearAndUserId(Integer startYear, Long userId);
}
