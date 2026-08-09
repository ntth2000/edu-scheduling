package com.eduschedule.service;

import com.eduschedule.dto.request.TeacherRequest;
import com.eduschedule.dto.response.BatchDeleteCascadeResponse;
import com.eduschedule.dto.response.SubjectResponse;
import com.eduschedule.dto.response.TeacherResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Teacher;
import com.eduschedule.entity.User;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SchoolYearRepository;
import com.eduschedule.repository.SlotRepository;
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
    private final SlotRepository slotRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final UserRepository userRepository;

    // year (dạng "2026-2027", tuỳ chọn): giới hạn thông tin chủ nhiệm về đúng năm học đang xem.
    // Giáo viên dùng chung cho mọi năm học, nên nếu không lọc thì một người chủ nhiệm ở nhiều năm
    // sẽ trả về tất cả các lớp đó cùng lúc.
    public List<TeacherResponse> getAll(String year) {
        User user = getCurrentUser();
        Long schoolYearId = null;
        if (year != null) {
            int startYear = Integer.parseInt(year.split("-")[0]);
            schoolYearId = schoolYearRepository.findByStartYearAndUserId(startYear, user.getId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy năm học: " + year))
                    .getId();
        }
        final Long yearId = schoolYearId;
        return teacherRepository.findAllByUserId(user.getId())
                .stream()
                .map(teacher -> toResponse(teacher, yearId))
                .toList();
    }

    public TeacherResponse getById(Long id) {
        return toResponse(findById(id), null);
    }

    @Transactional
    public TeacherResponse create(TeacherRequest request) {
        Set<Subject> subjects = getSubjects(request);

        Teacher teacher = Teacher.builder()
                .user(getCurrentUser())
                .fullName(request.getFullName())
                .maxPeriodsPerWeek(request.getMaxPeriodsPerWeek())
                .subjects(subjects)
                .build();

        return toResponse(teacherRepository.save(teacher), null);
    }

    @Transactional
    public TeacherResponse update(Long id, TeacherRequest request) {
        Teacher teacher = findById(id);
        Set<Subject> subjects = getSubjects(request);

        teacher.setFullName(request.getFullName());
        teacher.setMaxPeriodsPerWeek(request.getMaxPeriodsPerWeek());
        teacher.setSubjects(subjects);

        return toResponse(teacherRepository.save(teacher), null);
    }

    // Xoá giáo viên: chặn nếu đang là GVCN hoặc đã có tiết được xếp trong thời
    // khoá biểu; nếu chỉ có phân công chưa xếp thì xoá kèm các phân công đó.
    @Transactional
    public BatchDeleteCascadeResponse deleteBatch(List<Long> ids) {
        List<String> homeroomBlocked = new ArrayList<>();
        List<String> scheduledBlocked = new ArrayList<>();

        for (Long id : ids) {
            Teacher teacher = findById(id);
            boolean isHomeroom = !classRepository.findAllByHomeroomTeacherId(id).isEmpty();
            boolean isScheduled = !slotRepository.findByAssignment_TeacherId(id).isEmpty();
            if (isHomeroom) {
                homeroomBlocked.add(teacher.getFullName());
            } else if (isScheduled) {
                scheduledBlocked.add(teacher.getFullName());
            }
        }

        if (!homeroomBlocked.isEmpty() || !scheduledBlocked.isEmpty()) {
            List<String> reasons = new ArrayList<>();
            if (!homeroomBlocked.isEmpty()) {
                reasons.add("đang là giáo viên chủ nhiệm (" + String.join(", ", homeroomBlocked) + ")");
            }
            if (!scheduledBlocked.isEmpty()) {
                reasons.add("đã được xếp trong thời khoá biểu (" + String.join(", ", scheduledBlocked) + ")");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể xoá giáo viên: " + String.join("; ", reasons));
        }

        int deletedAssignments = 0;
        for (Long id : ids) {
            List<Assignment> assignments = assignmentRepository.findByTeacherId(id);
            deletedAssignments += assignments.size();
            assignmentRepository.deleteAll(assignments);
        }
        teacherRepository.deleteAllById(ids);

        return BatchDeleteCascadeResponse.builder()
                .deletedTeachers(ids.size())
                .deletedSlots(0)
                .deletedAssignments(deletedAssignments)
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
        if (request.getSubjectIds() == null || request.getSubjectIds().isEmpty()) {
            return new HashSet<>();
        }
        return new HashSet<>(subjectRepository.findAllById(request.getSubjectIds()));
    }

    // schoolYearId != null -> chỉ lấy lớp chủ nhiệm trong năm học đó (mỗi năm nhiều nhất một lớp).
    // schoolYearId == null -> gộp mọi năm học; tên lớp chỉ duy nhất trong phạm vi một năm
    // (ràng buộc UNIQUE(name, school_year_id)) nên phải distinct, tránh ra "1B, 1B".
    private TeacherResponse toResponse(Teacher teacher, Long schoolYearId) {
        String homeroomClass;
        if (schoolYearId != null) {
            homeroomClass = classRepository
                    .findByHomeroomTeacherIdAndSchoolYearId(teacher.getId(), schoolYearId)
                    .map(SchoolClass::getName)
                    .orElse(null);
        } else {
            List<String> classNames = classRepository
                    .findAllByHomeroomTeacherId(teacher.getId())
                    .stream()
                    .map(SchoolClass::getName)
                    .distinct()
                    .toList();
            homeroomClass = classNames.isEmpty() ? null : String.join(", ", classNames);
        }
        boolean isScheduled = !slotRepository.findByAssignment_TeacherId(teacher.getId()).isEmpty();
        return TeacherResponse.builder()
                .id(teacher.getId())
                .fullName(teacher.getFullName())
                .maxPeriodsPerWeek(teacher.getMaxPeriodsPerWeek())
                .homeroomClassName(homeroomClass)
                .scheduled(isScheduled)
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
