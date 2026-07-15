package com.eduschedule.repository;

import com.eduschedule.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
    Optional<SchoolClass> findByHomeroomTeacherId(Long teacherId);

    Boolean existsByHomeroomTeacherId(Long teacherId);

    boolean existsByHomeroomTeacherIdAndSchoolYearIdAndIdNot(Long teacherId, Long schoolYearId, Long excludeClassId);

    List<SchoolClass> findAllByHomeroomTeacherId(Long teacherId);

    List<SchoolClass> findAllBySchoolYearId(Long schoolYearId);

    boolean existsByNameAndSchoolYearId(String name, Long schoolYearId);

    List<SchoolClass> findAllBySchoolYearUserId(Long userId);
}
