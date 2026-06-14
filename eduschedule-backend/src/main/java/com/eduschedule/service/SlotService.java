package com.eduschedule.service;

import com.eduschedule.dto.request.SlotRequest;
import com.eduschedule.dto.response.SlotResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.Slot;
import com.eduschedule.entity.SpecialRoom;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.SpecialRoomRepository;
import com.eduschedule.repository.WeekRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SlotService {
    private final SlotRepository slotRepository;
    private final WeekRepository weekRepository;
    private final AssignmentRepository assignmentRepository;
    private final SpecialRoomRepository specialRoomRepository;

    public List<SlotResponse> getAll() {
        return slotRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SlotResponse> getByWeek(Long weekId) {
        return slotRepository.findByWeekId(weekId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SlotResponse saveOrUpdateSlot(SlotRequest request) {
        Week week = weekRepository.findById(request.getWeekId())
                .orElseThrow(() -> new RuntimeException("Week not found with id: " + request.getWeekId()));

        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new RuntimeException("Assignment not found: " + request.getAssignmentId()));

        Long classId = assignment.getSchoolClass().getId();
        Slot slot = slotRepository.findByWeekIdAndDayAndSessionAndPeriodAndAssignment_SchoolClassId(
                request.getWeekId(),
                request.getDay(),
                request.getSession(),
                request.getPeriod(),
                classId
        ).orElse(Slot.builder()
                .week(week)
                .day(request.getDay())
                .session(request.getSession())
                .period(request.getPeriod())
                .build());

        Long teacherId = assignment.getTeacher() != null ? assignment.getTeacher().getId() : null;
        Long existingSlotId = slot.getId() != null ? slot.getId() : -1L;
        if (teacherId != null && slotRepository.existsByWeekIdAndDayAndSessionAndPeriodAndAssignment_Teacher_IdAndIdNot(
                request.getWeekId(), request.getDay(), request.getSession(), request.getPeriod(), teacherId, existingSlotId)) {
            throw new RuntimeException("Giáo viên đang dạy lớp khác vào tiết này");
        }

        SpecialRoom specialRoom = null;
        if (request.getSpecialRoomId() != null) {
            specialRoom = specialRoomRepository.findById(request.getSpecialRoomId())
                    .orElseThrow(() -> new RuntimeException("Special room not found: " + request.getSpecialRoomId()));
        }

        slot.setAssignment(assignment);
        slot.setSpecialRoom(specialRoom);
        return toResponse(slotRepository.save(slot));
    }

    @Transactional
    public void deleteSlot(Long id) {
        if (!slotRepository.existsById(id)) {
            throw new RuntimeException("Slot not found with id: " + id);
        }
        slotRepository.deleteById(id);
    }

    private SlotResponse toResponse(Slot slot) {
        Assignment a = slot.getAssignment();
        return SlotResponse.builder()
                .id(slot.getId())
                .weekId(slot.getWeek().getId())
                .weekNumber(slot.getWeek().getWeekNumber())
                .assignmentId(a.getId())
                .day(slot.getDay())
                .session(slot.getSession())
                .period(slot.getPeriod())
                .specialRoomId(slot.getSpecialRoom() != null ? slot.getSpecialRoom().getId() : null)
                .subjectId(a.getSubject().getId())
                .subjectName(a.getSubject().getName())
                .teacherId(a.getTeacher() != null ? a.getTeacher().getId() : null)
                .teacherName(a.getTeacher() != null ? a.getTeacher().getFullName() : null)
                .classId(a.getSchoolClass().getId())
                .className(a.getSchoolClass().getName())
                .grade(a.getSchoolClass().getGrade())
                .build();
    }
}
