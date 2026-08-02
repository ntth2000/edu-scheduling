package com.eduschedule.service;

import com.eduschedule.dto.request.SlotRequest;
import com.eduschedule.dto.response.SlotResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Slot;
import com.eduschedule.entity.SpecialRoom;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.SpecialRoomRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.WeekRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SlotService {
    private final SlotRepository slotRepository;
    private final WeekRepository weekRepository;
    private final AssignmentRepository assignmentRepository;
    private final SpecialRoomRepository specialRoomRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final SubjectRepository subjectRepository;

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
        requireNotPublished(week);

        Assignment assignment;
        if (request.getAssignmentId() != null) {
            assignment = assignmentRepository.findById(request.getAssignmentId())
                    .orElseThrow(() -> new RuntimeException("Assignment not found: " + request.getAssignmentId()));
        } else if (request.getClassId() != null && request.getSubjectId() != null) {
            // GVCN-taught subject: find or create a null-teacher assignment
            assignment = assignmentRepository
                    .findBySchoolClassIdAndSubjectIdAndTeacherIsNull(request.getClassId(), request.getSubjectId())
                    .orElseGet(() -> {
                        SchoolClass cls = schoolClassRepository.findById(request.getClassId())
                                .orElseThrow(() -> new RuntimeException("Class not found: " + request.getClassId()));
                        Subject sub = subjectRepository.findById(request.getSubjectId())
                                .orElseThrow(() -> new RuntimeException("Subject not found: " + request.getSubjectId()));
                        return assignmentRepository.save(Assignment.builder()
                                .schoolClass(cls).subject(sub).teacher(null).build());
                    });
        } else {
            throw new RuntimeException("Either assignmentId or classId+subjectId must be provided");
        }

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
    public void deleteByTeacherFromWeek(Long teacherId, Long timetableId, Integer fromWeekNumber) {
        slotRepository.deleteByTeacherFromWeek(teacherId, timetableId, fromWeekNumber);
    }

    @Transactional
    public void deleteSlot(Long id) {
        Slot slot = slotRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Slot not found with id: " + id));
        requireNotPublished(slot.getWeek());
        slotRepository.deleteById(id);
    }

    private void requireNotPublished(Week week) {
        if (Boolean.TRUE.equals(week.getIsPublished())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Tuần đã công bố, cần hủy công bố trước khi chỉnh sửa");
        }
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
