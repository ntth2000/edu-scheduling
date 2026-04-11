package com.eduschedule.service;

import com.eduschedule.dto.request.SlotRequest;
import com.eduschedule.dto.response.SlotResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Slot;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Timetable;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.TimetableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SlotService {
    private final SlotRepository slotRepository;
    private final TimetableRepository timetableRepository;
    private final AssignmentRepository assignmentRepository;
    private final SchoolClassRepository classRepository;
    private final SubjectRepository subjectRepository;

    public List<SlotResponse> getAll() {
        return slotRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SlotResponse> getByTimetable(Long timetableId) {
        return slotRepository.findByTimetableId(timetableId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SlotResponse saveOrUpdateSlot(SlotRequest request) {
        Timetable timetable = timetableRepository.findById(request.getTimetableId())
                .orElseThrow(() -> new RuntimeException("Timetable not found with id: " + request.getTimetableId()));

        Assignment assignment = resolveAssignment(request);

        // Upsert: reuse existing slot at same (timetable, day, period) if any
        Slot slot = slotRepository.findByTimetableIdAndDayAndPeriod(
                request.getTimetableId(),
                request.getDay(),
                request.getPeriod()
        ).orElse(Slot.builder()
                .timetable(timetable)
                .day(request.getDay())
                .period(request.getPeriod())
                .build());

        // Teacher conflict check: same teacher, same time, different position
        Long teacherId = assignment.getTeacher() != null ? assignment.getTeacher().getId() : null;
        Long existingSlotId = slot.getId() != null ? slot.getId() : -1L;
        if (teacherId != null && slotRepository.existsByTimetableIdAndDayAndPeriodAndAssignment_Teacher_IdAndIdNot(
                request.getTimetableId(), request.getDay(), request.getPeriod(), teacherId, existingSlotId)) {
            throw new RuntimeException("Giáo viên đang dạy lớp khác vào tiết này");
        }

        slot.setAssignment(assignment);
        return toResponse(slotRepository.save(slot));
    }

    /**
     * Resolve the assignment to use for this slot.
     * If assignmentId is provided, look it up directly.
     * Otherwise, use classId + subjectId and find/create an assignment
     * with the class's homeroom teacher (GVCN-taught subject).
     */
    private Assignment resolveAssignment(SlotRequest request) {
        if (request.getAssignmentId() != null) {
            return assignmentRepository.findById(request.getAssignmentId())
                    .orElseThrow(() -> new RuntimeException("Assignment not found: " + request.getAssignmentId()));
        }

        if (request.getClassId() == null || request.getSubjectId() == null) {
            throw new RuntimeException("Cần cung cấp assignmentId hoặc classId + subjectId");
        }

        SchoolClass schoolClass = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp: " + request.getClassId()));
        Subject subject = subjectRepository.findById(request.getSubjectId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy môn: " + request.getSubjectId()));

        if (schoolClass.getHomeroomTeacher() == null) {
            throw new RuntimeException("Lớp " + schoolClass.getName() + " chưa có GVCN");
        }

        // Find or create assignment specifically for GVCN + this class+subject
        return assignmentRepository.findBySchoolClassIdAndSubjectIdAndTeacherId(
                request.getClassId(), request.getSubjectId(), schoolClass.getHomeroomTeacher().getId())
                .orElseGet(() -> assignmentRepository.save(Assignment.builder()
                        .schoolClass(schoolClass)
                        .subject(subject)
                        .teacher(schoolClass.getHomeroomTeacher())
                        .build()));
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
                .timetableId(slot.getTimetable().getId())
                .assignmentId(a.getId())
                .day(slot.getDay())
                .period(slot.getPeriod())
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
