package com.eduschedule.repository;

import com.eduschedule.entity.SpecialRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpecialRoomRepository extends JpaRepository<SpecialRoom, Long> {
    List<SpecialRoom> findAllByUserId(Long userId);
    boolean existsByNameAndUserId(String name, Long userId);
    boolean existsBySubjectIdAndUserId(Long subjectId, Long userId);
    boolean existsBySubjectIdAndUserIdAndIdNot(Long subjectId, Long userId, Long id);
}
