package com.eduschedule.service;

import com.eduschedule.dto.request.SubjectRequest;
import com.eduschedule.dto.response.SubjectResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.Subject;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SubjectService {
    private final SubjectRepository subjectRepository;
    private final AssignmentRepository assignmentRepository;
    private final SlotRepository slotRepository;

    public List<SubjectResponse> getAll() {
        return subjectRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SubjectResponse getById(Long id) {
        return toResponse(findById(id));
    }

    public SubjectResponse create(SubjectRequest request) {
        if (subjectRepository.existsByName(request.getName())) {
            throw new RuntimeException("Môn học '" + request.getName() + "' đã tồn tại");
        }

        Subject subject = Subject.builder()
                .name(request.getName())
                .shortName(request.getShortName())
                .periodsGrade1(request.getPeriodsGrade1())
                .periodsGrade2(request.getPeriodsGrade2())
                .periodsGrade3(request.getPeriodsGrade3())
                .periodsGrade4(request.getPeriodsGrade4())
                .periodsGrade5(request.getPeriodsGrade5())
                .build();

        return toResponse(subjectRepository.save(subject));
    }

    public SubjectResponse update(Long id, SubjectRequest request) {
        Subject subject = findById(id);

        subject.setName(request.getName());
        subject.setShortName(request.getShortName());
        subject.setPeriodsGrade1(request.getPeriodsGrade1());
        subject.setPeriodsGrade2(request.getPeriodsGrade2());
        subject.setPeriodsGrade3(request.getPeriodsGrade3());
        subject.setPeriodsGrade4(request.getPeriodsGrade4());
        subject.setPeriodsGrade5(request.getPeriodsGrade5());

        return toResponse(subjectRepository.save(subject));
    }

    @Transactional
    public void delete(Long id) {
        findById(id);
        cascadeDeleteSubject(id);
        subjectRepository.deleteById(id);
    }

    @Transactional
    public void deleteBatch(List<Long> ids) {
        ids.forEach(this::cascadeDeleteSubject);
        subjectRepository.deleteAllById(ids);
    }

    private void cascadeDeleteSubject(Long subjectId) {
        List<Assignment> assignments = assignmentRepository.findBySubjectId(subjectId);
        List<Long> assignmentIds = assignments.stream().map(Assignment::getId).toList();
        if (!assignmentIds.isEmpty()) {
            slotRepository.deleteByAssignmentIdIn(assignmentIds);
        }
        assignmentRepository.deleteAll(assignments);
    }

    private Subject findById(Long id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy môn học với id: " + id));
    }

    private SubjectResponse toResponse(Subject subject) {
        return SubjectResponse.builder()
                .id(subject.getId())
                .name(subject.getName())
                .shortName(subject.getShortName())
                .periodsGrade1(subject.getPeriodsGrade1())
                .periodsGrade2(subject.getPeriodsGrade2())
                .periodsGrade3(subject.getPeriodsGrade3())
                .periodsGrade4(subject.getPeriodsGrade4())
                .periodsGrade5(subject.getPeriodsGrade5())
                .build();
    }
}
