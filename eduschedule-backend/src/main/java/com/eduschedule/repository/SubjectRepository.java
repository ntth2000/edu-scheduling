package com.eduschedule.repository;

import com.eduschedule.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    boolean existsByName(String name);

    @Query("SELECT s FROM Subject s LEFT JOIN FETCH s.teachers WHERE s.id = :id")
    Optional<Subject> findByIdWithTeachers(@Param("id") Long id);
}
