package com.eduschedule.repository;

import com.eduschedule.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssignmentRepository
        extends JpaRepository<Assignment, Long> {

    List<Assignment> findBySchoolClassId(Long classId);

    List<Assignment> findByTeacherId(Long teacherId);

    List<Assignment> findBySubjectId(Long subjectId);

    boolean existsBySchoolClassIdAndSubjectId(
            Long classId, Long subjectId
    );

    Optional<Assignment> findBySchoolClassIdAndSubjectId(
            Long classId, Long subjectId
    );

    Optional<Assignment> findBySchoolClassIdAndSubjectIdAndTeacherId(
            Long classId, Long subjectId, Long teacherId
    );

    @Query("""
                SELECT COALESCE(SUM(
                    CASE a.schoolClass.grade
                        WHEN 1 THEN s.periodsGrade1
                        WHEN 2 THEN s.periodsGrade2
                        WHEN 3 THEN s.periodsGrade3
                        WHEN 4 THEN s.periodsGrade4
                        WHEN 5 THEN s.periodsGrade5
                        ELSE 0
                    END
                ), 0)
                FROM Assignment a
                JOIN a.subject s
                WHERE a.teacher.id = :teacherId
            """)
    Integer countTotalPeriodsByTeacher(
            @Param("teacherId") Long teacherId
    );
}