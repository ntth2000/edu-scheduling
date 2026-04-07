package com.eduschedule.repository;

import com.eduschedule.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {
    Optional<SchoolClass> findByHomeroomTeacherId(Long teacherId);

    Boolean existsByHomeroomTeacherId(Long teacherId);
}
