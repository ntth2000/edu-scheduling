package com.eduschedule.service;

import com.eduschedule.dto.request.TeacherRequest;
import com.eduschedule.dto.response.BatchDeleteCascadeResponse;
import com.eduschedule.dto.response.SubjectResponse;
import com.eduschedule.dto.response.TeacherCascadeResponse;
import com.eduschedule.dto.response.TeacherResponse;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Teacher;
import com.eduschedule.entity.User;
import com.eduschedule.entity.enums.TeacherType;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.TeacherRepository;
import com.eduschedule.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeacherService {
    private final TeacherRepository teacherRepository;
    private final SchoolClassRepository classRepository;
    private final SubjectRepository subjectRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    public List<TeacherResponse> getAll() {
        return teacherRepository.findAllByUserId(getCurrentUser().getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public TeacherResponse getById(Long id) {
        return toResponse(findById(id));
    }

    @Transactional
    public TeacherResponse create(TeacherRequest request) {
        Set<Subject> subjects = getSubjects(request);

        Teacher teacher = Teacher.builder()
                .user(getCurrentUser())
                .fullName(request.getFullName())
                .type(request.getType())
                .maxPeriodsPerWeek(request.getMaxPeriodsPerWeek())
                .isActive(true)
                .subjects(subjects)
                .build();

        return toResponse(teacherRepository.save(teacher));
    }

    @Transactional
    public TeacherResponse update(Long id, TeacherRequest request) {
        Teacher teacher = findById(id);
        Set<Subject> subjects = getSubjects(request);

        teacher.setType(request.getType());
        teacher.setFullName(request.getFullName());
        teacher.setMaxPeriodsPerWeek(request.getMaxPeriodsPerWeek());
        teacher.setSubjects(subjects);

        return toResponse(teacherRepository.save(teacher));
    }

    @Transactional
    public TeacherCascadeResponse toggleStatus(Long id) {
        Teacher teacher = findById(id);
        teacher.setIsActive(!Boolean.TRUE.equals(teacher.getIsActive()));

        return TeacherCascadeResponse.builder()
                .teacher(toResponse(teacherRepository.save(teacher)))
                .deletedSlots(0)
                .deletedAssignments(0)
                .unsetHomeroomClasses(List.of())
                .build();
    }

    @Transactional
    public BatchDeleteCascadeResponse deleteBatch(List<Long> ids) {
        List<String> blocked = new ArrayList<>();

        for (Long id : ids) {
            Teacher teacher = findById(id);
            boolean hasAssignments = assignmentRepository.existsByTeacherId(id);
            boolean isHomeroom = !classRepository.findAllByHomeroomTeacherId(id).isEmpty();
            if (hasAssignments || isHomeroom) {
                blocked.add(teacher.getFullName());
            }
        }

        if (!blocked.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể xoá giáo viên đã có phân công: " + String.join(", ", blocked));
        }

        teacherRepository.deleteAllById(ids);

        return BatchDeleteCascadeResponse.builder()
                .deletedTeachers(ids.size())
                .deletedSlots(0)
                .deletedAssignments(0)
                .unsetHomeroomClasses(List.of())
                .build();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không tồn tại"));
    }

    private Teacher findById(Long id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên với id: " + id));
    }

    private Set<Subject> getSubjects(TeacherRequest request) {
        if ((request.getType() == TeacherType.BO_MON || request.getType() == TeacherType.KHAC)
                && request.getSubjectIds() != null
                && !request.getSubjectIds().isEmpty()) {
            return new HashSet<>(subjectRepository.findAllById(request.getSubjectIds()));
        }
        return new HashSet<>();
    }

    private TeacherResponse toResponse(Teacher teacher) {
        String homeroomClass = null;
        if (teacher.getType() == TeacherType.CHU_NHIEM) {
            List<String> classNames = classRepository
                    .findAllByHomeroomTeacherId(teacher.getId())
                    .stream()
                    .map(SchoolClass::getName)
                    .toList();
            homeroomClass = classNames.isEmpty() ? null : String.join(", ", classNames);
        }
        return TeacherResponse.builder()
                .id(teacher.getId())
                .fullName(teacher.getFullName())
                .type(teacher.getType())
                .maxPeriodsPerWeek(teacher.getMaxPeriodsPerWeek())
                .isActive(teacher.getIsActive())
                .homeroomClassName(homeroomClass)
                .subjects(
                        teacher.getSubjects().stream()
                                .map(s -> SubjectResponse.builder()
                                        .id(s.getId())
                                        .name(s.getName())
                                        .build()
                                ).toList()
                ).build();
    }
}
