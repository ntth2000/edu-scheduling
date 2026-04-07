package com.eduschedule.repository;


import com.eduschedule.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    @Query("""
            SELECT COUNT(c) > 0 FROM SchoolClass c
            WHERE c.homeroomTeacher.id = :teacherId
            """)
    boolean isAlreadyHomeroom(Long teacherId);

    List<Teacher> findByIsActiveTrue();
}
