package com.eduschedule.repository;

import com.eduschedule.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findAllByUserId(Long userId);
    boolean existsByNameAndUserId(String name, Long userId);

    @Query("SELECT s FROM Subject s LEFT JOIN FETCH s.teachers WHERE s.id = :id")
    Optional<Subject> findByIdWithTeachers(@Param("id") Long id);

    @Modifying
    @Query(value = "DELETE FROM teacher_subjects WHERE subject_id = :subjectId", nativeQuery = true)
    void deleteTeacherSubjectsBySubjectId(@Param("subjectId") Long subjectId);

    @Modifying
    @Query(value = "DELETE FROM teacher_subjects WHERE subject_id IN :subjectIds", nativeQuery = true)
    void deleteTeacherSubjectsBySubjectIdIn(@Param("subjectIds") List<Long> subjectIds);
}
