package com.eduschedule.service;

import com.eduschedule.dto.request.ClassRequest;
import com.eduschedule.dto.response.ClassResponse;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Teacher;
import com.eduschedule.entity.enums.TeacherType;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolClassService {
    private final SchoolClassRepository classRepository;
    private final TeacherRepository teacherRepository;

    public List<ClassResponse> getAll() {
        return classRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
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

        SchoolClass schoolClass = SchoolClass.builder()
                .name(request.getName())
                .grade(request.getGrade())
                .homeroomTeacher(teacher)
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
        classRepository.deleteById(id);
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
                .build();
    }
}
