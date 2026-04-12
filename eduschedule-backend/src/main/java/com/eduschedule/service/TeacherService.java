package com.eduschedule.service;

import com.eduschedule.dto.request.TeacherRequest;
import com.eduschedule.dto.response.BatchDeleteCascadeResponse;
import com.eduschedule.dto.response.SubjectResponse;
import com.eduschedule.dto.response.TeacherCascadeResponse;
import com.eduschedule.dto.response.TeacherResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Teacher;
import com.eduschedule.entity.enums.TeacherType;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.TeacherRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
    private final SlotRepository slotRepository;

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
    public TeacherCascadeResponse toggleStatus(Long id) {
        Teacher teacher = findById(id);
        boolean wasActive = Boolean.TRUE.equals(teacher.getIsActive());
        teacher.setIsActive(!wasActive);

        int deletedSlots = 0;
        int deletedAssignments = 0;
        List<String> unsetClasses = new ArrayList<>();

        // Cascade only when deactivating
        if (wasActive) {
            CascadeResult cascade = cascadeRemoveTeacher(id);
            deletedSlots = cascade.deletedSlots;
            deletedAssignments = cascade.deletedAssignments;
            unsetClasses = cascade.unsetHomeroomClasses;
        }

        return TeacherCascadeResponse.builder()
                .teacher(toResponse(teacherRepository.save(teacher)))
                .deletedSlots(deletedSlots)
                .deletedAssignments(deletedAssignments)
                .unsetHomeroomClasses(unsetClasses)
                .build();
    }

    @Transactional
    public BatchDeleteCascadeResponse deleteBatch(List<Long> ids) {
        int totalSlots = 0;
        int totalAssignments = 0;
        List<String> allUnsetClasses = new ArrayList<>();

        for (Long id : ids) {
            CascadeResult cascade = cascadeRemoveTeacher(id);
            totalSlots += cascade.deletedSlots;
            totalAssignments += cascade.deletedAssignments;
            allUnsetClasses.addAll(cascade.unsetHomeroomClasses);
        }

        teacherRepository.deleteAllById(ids);

        return BatchDeleteCascadeResponse.builder()
                .deletedTeachers(ids.size())
                .deletedSlots(totalSlots)
                .deletedAssignments(totalAssignments)
                .unsetHomeroomClasses(allUnsetClasses)
                .build();
    }

    /**
     * Remove all slots, assignments, and homeroom links for a teacher.
     */
    private CascadeResult cascadeRemoveTeacher(Long teacherId) {
        // 1. Delete slots referencing this teacher's assignments
        List<Assignment> assignments = assignmentRepository.findByTeacherId(teacherId);
        List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
        int deletedSlots = 0;
        if (!assignmentIds.isEmpty()) {
            deletedSlots = slotRepository.findByAssignment_TeacherId(teacherId).size();
            slotRepository.deleteByAssignmentIdIn(assignmentIds);
        }

        // 2. Delete assignments
        int deletedAssignments = assignments.size();
        assignmentRepository.deleteAll(assignments);

        // 3. Unset homeroom teacher
        List<SchoolClass> homeroomClasses = classRepository.findAllByHomeroomTeacherId(teacherId);
        List<String> unsetClassNames = new ArrayList<>();
        for (SchoolClass cls : homeroomClasses) {
            unsetClassNames.add(cls.getName());
            cls.setHomeroomTeacher(null);
            classRepository.save(cls);
        }

        return new CascadeResult(deletedSlots, deletedAssignments, unsetClassNames);
    }

    private record CascadeResult(int deletedSlots, int deletedAssignments, List<String> unsetHomeroomClasses) {}

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
