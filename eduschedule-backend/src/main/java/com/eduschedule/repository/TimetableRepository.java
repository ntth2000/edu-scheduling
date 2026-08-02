package com.eduschedule.repository;

import com.eduschedule.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Long> {
    List<Timetable> findBySchoolYearId(Long schoolYearId);
    boolean existsBySchoolYearIdAndSemesterOrder(Long schoolYearId, Integer semesterOrder);
    Optional<Timetable> findByPublicTokenAndIsPublicTrue(String publicToken);
}
