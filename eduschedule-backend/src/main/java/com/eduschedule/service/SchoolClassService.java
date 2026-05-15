package com.eduschedule.service;

import com.eduschedule.dto.request.ClassRequest;
import com.eduschedule.dto.response.ClassResponse;
import com.eduschedule.entity.*;
import com.eduschedule.entity.enums.TeacherType;
import com.eduschedule.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolClassService {
    private final SchoolClassRepository classRepository;
    private final TeacherRepository teacherRepository;
    private final AssignmentRepository assignmentRepository;
    private final SlotRepository slotRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final UserRepository userRepository;

    public List<ClassResponse> getAll(String year) {
        User user = getCurrentUser();
        if (year != null) {
            int startYear = Integer.parseInt(year.split("-")[0]);
            SchoolYear schoolYear = schoolYearRepository.findByStartYearAndUserId(startYear, user.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy năm học: " + year));
            return classRepository.findAllBySchoolYearId(schoolYear.getId())
                    .stream().map(this::toResponse).toList();
        }
        return classRepository.findAllBySchoolYearUserId(user.getId())
                .stream().map(this::toResponse).toList();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không tồn tại"));
    }

    public ClassResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public ClassResponse create(ClassRequest request) {
        Teacher teacher = null;
        if (request.getHomeroomTeacherId() != null) {
            teacher = findTeacherAndValidate(request.getHomeroomTeacherId(), null);
        }

        SchoolYear schoolYear = null;
        if (request.getSchoolYearId() != null) {
            schoolYear = schoolYearRepository.findById(request.getSchoolYearId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy năm học với id: " + request.getSchoolYearId()));
        }

        SchoolClass schoolClass = SchoolClass.builder()
                .name(request.getName())
                .grade(request.getGrade())
                .homeroomTeacher(teacher)
                .schoolYear(schoolYear)
                .build();

        return toResponse(classRepository.save(schoolClass));
    }

    @Transactional
    public ClassResponse update(Long id, ClassRequest request) {
        SchoolClass schoolClass = findById(id);

        Teacher teacher = null;
        if (request.getHomeroomTeacherId() != null) {
            teacher = findTeacherAndValidate(request.getHomeroomTeacherId(), id);
        }

        schoolClass.setName(request.getName());
        schoolClass.setGrade(request.getGrade());
        schoolClass.setHomeroomTeacher(teacher);

        return toResponse(classRepository.save(schoolClass));
    }

    @Transactional
    public void delete(Long id) {
        findById(id);
        cascadeDeleteClass(id);
        classRepository.deleteById(id);
    }

    @Transactional
    public void deleteBatch(List<Long> ids) {
        ids.forEach(this::cascadeDeleteClass);
        classRepository.deleteAllById(ids);
    }

    private void cascadeDeleteClass(Long classId) {
        List<Assignment> assignments = assignmentRepository.findBySchoolClassId(classId);
        List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
        if (!assignmentIds.isEmpty()) {
            slotRepository.deleteByAssignmentIdIn(assignmentIds);
        }
        assignmentRepository.deleteAll(assignments);
    }

    private SchoolClass findById(Long id) {
        return classRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp với id: " + id));
    }

    private Teacher findTeacherAndValidate(Long teacherId, Long currentClassId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên với id: " + teacherId));

        if (teacher.getType() != TeacherType.CHU_NHIEM) {
            throw new RuntimeException("Chỉ giáo viên chủ nhiệm mới có thể được phân công chủ nhiệm lớp.");
        }

        // Check if teacher is already homeroom teacher of another class
        classRepository.findByHomeroomTeacherId(teacherId).ifPresent(c -> {
            if (!c.getId().equals(currentClassId)) {
                throw new RuntimeException("Giáo viên này đã chủ nhiệm lớp " + c.getName());
            }
        });

        return teacher;
    }

    private ClassResponse toResponse(SchoolClass schoolClass) {
        return ClassResponse.builder()
                .id(schoolClass.getId())
                .name(schoolClass.getName())
                .grade(schoolClass.getGrade())
                .homeroomTeacherId(schoolClass.getHomeroomTeacher() != null ? schoolClass.getHomeroomTeacher().getId() : null)
                .homeroomTeacherName(schoolClass.getHomeroomTeacher() != null ? schoolClass.getHomeroomTeacher().getFullName() : null)
                .schoolYearId(schoolClass.getSchoolYear() != null ? schoolClass.getSchoolYear().getId() : null)
                .schoolYearName(schoolClass.getSchoolYear() != null
                        ? schoolClass.getSchoolYear().getStartYear() + "-" + (schoolClass.getSchoolYear().getStartYear() + 1)
                        : null)
                .build();
    }
}
