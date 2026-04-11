package com.eduschedule.service;

import com.eduschedule.dto.request.AssignmentRequest;
import com.eduschedule.dto.request.HomeroomAssignmentRequest;
import com.eduschedule.dto.response.AssignmentResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Teacher;
import com.eduschedule.entity.enums.TeacherType;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
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

    public List<AssignmentResponse> getAll() {
        return assignmentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
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

        if (teacher.getType() != TeacherType.CHU_NHIEM) {
            throw new RuntimeException(
                    "Giáo viên " + teacher.getFullName() +
                            " không phải GVCN");
        }

        if (classRepository.existsByHomeroomTeacherId(teacher.getId())
                && (schoolClass.getHomeroomTeacher() == null
                || !schoolClass.getHomeroomTeacher()
                .getId().equals(teacher.getId()))) {
            throw new RuntimeException(
                    "Giáo viên " + teacher.getFullName() +
                            " đã là GVCN của lớp khác");
        }

        schoolClass.setHomeroomTeacher(teacher);
        classRepository.save(schoolClass);
    }

    @Transactional
    public AssignmentResponse assign(AssignmentRequest request) {
        SchoolClass schoolClass = findClass(request.getClassId());
        Subject subject = findSubject(request.getSubjectId());
        Teacher teacher = findTeacher(request.getTeacherId());

        boolean canTeach = teacher.getSubjects()
                .stream()
                .anyMatch(s -> s.getId().equals(subject.getId()));
        if (!canTeach) {
            throw new RuntimeException(
                    "Giáo viên " + teacher.getFullName() +
                            " không dạy môn " + subject.getName());
        }

        Assignment assignment = assignmentRepository
                .findBySchoolClassIdAndSubjectId(
                        request.getClassId(), request.getSubjectId())
                .orElse(Assignment.builder()
                        .schoolClass(schoolClass)
                        .subject(subject)
                        .build());

        assignment.setTeacher(teacher);
        return toResponse(assignmentRepository.save(assignment));
    }

    @Transactional
    public void delete(Long id) {
        if (!assignmentRepository.existsById(id)) {
            throw new RuntimeException(
                    "Không tìm thấy phân công với id: " + id);
        }
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
        int periods = getPeriodsForGrade(
                a.getSubject(),
                a.getSchoolClass().getGrade());
        return AssignmentResponse.builder()
                .id(a.getId())
                .classId(a.getSchoolClass().getId())
                .className(a.getSchoolClass().getName())
                .grade(a.getSchoolClass().getGrade())
                .subjectId(a.getSubject().getId())
                .subjectName(a.getSubject().getName())
                .subjectShortName(a.getSubject().getShortName())
                .teacherId(a.getTeacher().getId())
                .teacherName(a.getTeacher().getFullName())
                .periodsPerWeek(periods)
                .build();
    }
}