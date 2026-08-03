package com.eduschedule.service;

import com.eduschedule.dto.request.AssignmentRequest;
import com.eduschedule.dto.request.HomeroomAssignmentRequest;
import com.eduschedule.dto.response.AssignmentResponse;
import com.eduschedule.entity.*;
import com.eduschedule.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;
    private final SchoolClassRepository classRepository;
    private final UserRepository userRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final SlotRepository slotRepository;

    public List<AssignmentResponse> getAll(String year) {
        User user = getCurrentUser();
        if (year != null) {
            int startYear = Integer.parseInt(year.split("-")[0]);
            SchoolYear schoolYear = schoolYearRepository.findByStartYearAndUserId(startYear, user.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy năm học: " + year));
            return assignmentRepository.findBySchoolClassSchoolYearId(schoolYear.getId())
                    .stream().map(this::toResponse).toList();
        }
        return assignmentRepository.findBySchoolClassSchoolYearUserId(user.getId())
                .stream().map(this::toResponse).toList();
    }

    private User getCurrentUser() {
        String username = (String) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return userRepository.findByUsername(username).orElseThrow();
    }

    // ── LẤY PHÂN CÔNG THEO LỚP ───────────────────────
    public List<AssignmentResponse> getByClass(Long classId) {
        return assignmentRepository
                .findBySchoolClassId(classId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AssignmentResponse> getByTeacher(Long teacherId) {
        return assignmentRepository
                .findByTeacherId(teacherId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void assignHomeroom(HomeroomAssignmentRequest request) {
        SchoolClass schoolClass = findClass(request.getClassId());
        Teacher teacher = findTeacher(request.getTeacherId());

        // Ràng buộc "1 GV chỉ chủ nhiệm 1 lớp" chỉ tính trong CÙNG năm học của lớp đang phân
        // công — không chặn nếu GV đó đang là GVCN của 1 lớp ở năm học khác.
        if (schoolClass.getSchoolYear() != null) {
            classRepository
                    .findByHomeroomTeacherIdAndSchoolYearId(teacher.getId(), schoolClass.getSchoolYear().getId())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(schoolClass.getId())) {
                            throw new RuntimeException(
                                    "Giáo viên " + teacher.getFullName() +
                                            " đã là GVCN của lớp " + existing.getName() + " trong năm học này");
                        }
                    });
        }

        schoolClass.setHomeroomTeacher(teacher);
        classRepository.save(schoolClass);
    }

    @Transactional
    public AssignmentResponse assign(AssignmentRequest request) {
        SchoolClass schoolClass = findClass(request.getClassId());
        Subject subject = findSubject(request.getSubjectId());
        Teacher teacher = findTeacher(request.getTeacherId());

        Assignment assignment = assignmentRepository
                .findBySchoolClassIdAndSubjectId(
                        request.getClassId(), request.getSubjectId())
                .orElse(Assignment.builder()
                        .schoolClass(schoolClass)
                        .subject(subject)
                        .build());

        assignment.setTeacher(teacher);
        assignment.setPeriodsPerWeek(getPeriodsForGrade(subject, schoolClass.getGrade()));
        return toResponse(assignmentRepository.save(assignment));
    }

    @Transactional
    public void delete(Long id) {
        if (!assignmentRepository.existsById(id)) {
            throw new RuntimeException(
                    "Không tìm thấy phân công với id: " + id);
        }
        slotRepository.deleteByAssignmentIdIn(List.of(id));
        assignmentRepository.deleteById(id);
    }

    private int getPeriodsForGrade(Subject subject, int grade) {
        return switch (grade) {
            case 1 -> subject.getPeriodsGrade1();
            case 2 -> subject.getPeriodsGrade2();
            case 3 -> subject.getPeriodsGrade3();
            case 4 -> subject.getPeriodsGrade4();
            case 5 -> subject.getPeriodsGrade5();
            default -> 0;
        };
    }

    private SchoolClass findClass(Long id) {
        return classRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy lớp với id: " + id));
    }

    private Subject findSubject(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy môn học với id: " + id));
    }

    private Teacher findTeacher(Long id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Không tìm thấy giáo viên với id: " + id));
    }

    private AssignmentResponse toResponse(Assignment a) {
        int periods = a.getPeriodsPerWeek() != null
                ? a.getPeriodsPerWeek()
                : getPeriodsForGrade(a.getSubject(), a.getSchoolClass().getGrade());
        return AssignmentResponse.builder()
                .id(a.getId())
                .classId(a.getSchoolClass().getId())
                .className(a.getSchoolClass().getName())
                .grade(a.getSchoolClass().getGrade())
                .subjectId(a.getSubject().getId())
                .subjectName(a.getSubject().getName())
                .teacherId(a.getTeacher() != null ? a.getTeacher().getId() : null)
                .teacherName(a.getTeacher() != null ? a.getTeacher().getFullName() : null)
                .periodsPerWeek(periods)
                .build();
    }
}