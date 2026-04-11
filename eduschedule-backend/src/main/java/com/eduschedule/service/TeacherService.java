package com.eduschedule.service;

import com.eduschedule.dto.request.TeacherRequest;
import com.eduschedule.dto.response.SubjectResponse;
import com.eduschedule.dto.response.TeacherResponse;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Teacher;
import com.eduschedule.entity.enums.TeacherType;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.TeacherRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeacherService {
    private final TeacherRepository teacherRepository;
    private final SchoolClassRepository classRepository;
    private final SubjectRepository subjectRepository;

    public List<TeacherResponse> getAll() {
        return teacherRepository.findAll()
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
    public TeacherResponse toggleStatus(Long id) {
        Teacher teacher = findById(id);
        teacher.setIsActive(!teacher.getIsActive());
        return toResponse(teacherRepository.save(teacher));
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
            homeroomClass = classRepository
                    .findByHomeroomTeacherId(teacher.getId())
                    .stream()
                    .findFirst()
                    .map(c -> c.getName())
                    .orElse(null);
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
                                        .shortName(s.getShortName())
                                        .build()
                                ).toList()
                ).build();
    }
}
