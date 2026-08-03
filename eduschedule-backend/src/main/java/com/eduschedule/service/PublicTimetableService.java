package com.eduschedule.service;

import com.eduschedule.dto.response.AssignmentResponse;
import com.eduschedule.dto.response.ClassResponse;
import com.eduschedule.dto.response.PublicTimetableInfoResponse;
import com.eduschedule.dto.response.SlotResponse;
import com.eduschedule.dto.response.SubjectResponse;
import com.eduschedule.dto.response.TeacherResponse;
import com.eduschedule.dto.response.WeekResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.SchoolYear;
import com.eduschedule.entity.Slot;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Teacher;
import com.eduschedule.entity.Timetable;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.TeacherRepository;
import com.eduschedule.repository.TimetableRepository;
import com.eduschedule.repository.WeekRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

// Bề mặt đọc công khai (không auth) cho khách xem thời khoá biểu đã publish qua token.
// Tách khỏi TimetableService vì trách nhiệm khác hẳn (đọc theo token vs. orchestration
// publish/unpublish của chủ sở hữu), và các toResponse() của SchoolClassService/TeacherService/
// SubjectService/AssignmentService là private nên không tái dùng trực tiếp được — mapping ở đây
// cố tình gọn, chỉ đủ field frontend cần.
@Service
@RequiredArgsConstructor
public class PublicTimetableService {
    private final TimetableRepository timetableRepository;
    private final WeekRepository weekRepository;
    private final SlotRepository slotRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final TeacherRepository teacherRepository;
    private final SubjectRepository subjectRepository;
    private final AssignmentRepository assignmentRepository;

    public PublicTimetableInfoResponse getInfo(String token) {
        Timetable timetable = resolveTimetable(token);
        SchoolYear schoolYear = timetable.getSchoolYear();
        Long schoolYearId = schoolYear.getId();
        Long userId = schoolYear.getUser().getId();

        List<ClassResponse> classes = schoolClassRepository.findAllBySchoolYearId(schoolYearId)
                .stream().map(this::toClassResponse).toList();
        List<Teacher> teacherEntities = teacherRepository.findAllByUserId(userId);
        List<TeacherResponse> teachers = teacherEntities.stream().map(this::toTeacherResponse).toList();
        List<SubjectResponse> subjects = subjectRepository.findAllByUserId(userId)
                .stream().map(this::toSubjectResponse).toList();
        List<AssignmentResponse> assignments = assignmentRepository.findBySchoolClassSchoolYearId(schoolYearId)
                .stream().map(this::toAssignmentResponse).toList();

        return PublicTimetableInfoResponse.builder()
                .schoolYearName(schoolYear.getStartYear() + "-" + (schoolYear.getStartYear() + 1))
                .semesterOrder(timetable.getSemesterOrder())
                .classes(classes)
                .teachers(teachers)
                .subjects(subjects)
                .assignments(assignments)
                .build();
    }

    public List<WeekResponse> getWeeks(String token) {
        Timetable timetable = resolveTimetable(token);
        return weekRepository.findByTimetableIdOrderByWeekNumber(timetable.getId())
                .stream().map(this::toWeekResponse).toList();
    }

    public List<SlotResponse> getSlots(String token, Long weekId) {
        Timetable timetable = resolveTimetable(token);
        Week week = weekRepository.findById(weekId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tuần"));
        if (!week.getTimetable().getId().equals(timetable.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tuần");
        }
        if (!Boolean.TRUE.equals(week.getIsPublished())) {
            return List.of();
        }
        return slotRepository.findByWeekId(weekId).stream().map(this::toSlotResponse).toList();
    }

    private Timetable resolveTimetable(String token) {
        return timetableRepository.findByPublicTokenAndIsPublicTrue(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy thời khoá biểu công khai"));
    }

    private ClassResponse toClassResponse(SchoolClass c) {
        return ClassResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .grade(c.getGrade())
                .homeroomTeacherId(c.getHomeroomTeacher() != null ? c.getHomeroomTeacher().getId() : null)
                .homeroomTeacherName(c.getHomeroomTeacher() != null ? c.getHomeroomTeacher().getFullName() : null)
                .schoolYearId(c.getSchoolYear() != null ? c.getSchoolYear().getId() : null)
                .build();
    }

    private TeacherResponse toTeacherResponse(Teacher teacher) {
        List<String> classNames = schoolClassRepository.findAllByHomeroomTeacherId(teacher.getId())
                .stream().map(SchoolClass::getName).toList();
        return TeacherResponse.builder()
                .id(teacher.getId())
                .fullName(teacher.getFullName())
                .maxPeriodsPerWeek(teacher.getMaxPeriodsPerWeek())
                .homeroomClassName(classNames.isEmpty() ? null : String.join(", ", classNames))
                .scheduled(!slotRepository.findByAssignment_TeacherId(teacher.getId()).isEmpty())
                .subjects(teacher.getSubjects().stream()
                        .map(s -> SubjectResponse.builder().id(s.getId()).name(s.getName()).build())
                        .toList())
                .build();
    }

    private SubjectResponse toSubjectResponse(Subject subject) {
        return SubjectResponse.builder()
                .id(subject.getId())
                .name(subject.getName())
                .periodsGrade1(subject.getPeriodsGrade1())
                .periodsGrade2(subject.getPeriodsGrade2())
                .periodsGrade3(subject.getPeriodsGrade3())
                .periodsGrade4(subject.getPeriodsGrade4())
                .periodsGrade5(subject.getPeriodsGrade5())
                .build();
    }

    private AssignmentResponse toAssignmentResponse(Assignment a) {
        return AssignmentResponse.builder()
                .id(a.getId())
                .classId(a.getSchoolClass().getId())
                .className(a.getSchoolClass().getName())
                .grade(a.getSchoolClass().getGrade())
                .subjectId(a.getSubject().getId())
                .subjectName(a.getSubject().getName())
                .teacherId(a.getTeacher() != null ? a.getTeacher().getId() : null)
                .teacherName(a.getTeacher() != null ? a.getTeacher().getFullName() : null)
                .periodsPerWeek(a.getPeriodsPerWeek())
                .build();
    }

    private WeekResponse toWeekResponse(Week w) {
        LocalDate start = w.getStartDate();
        return WeekResponse.builder()
                .id(w.getId())
                .weekNumber(w.getWeekNumber())
                .startDate(start)
                .endDate(start != null ? start.plusDays(6) : null)
                .isPublished(w.getIsPublished())
                .build();
    }

    // Chỉ gọi cho tuần đã công bố (getSlots() trả rỗng sớm nếu chưa) nên dùng snapshot đóng
    // băng lúc publish — xem ghi chú tương tự ở SlotService#toResponse.
    private SlotResponse toSlotResponse(Slot slot) {
        Assignment a = slot.getAssignment();
        boolean published = Boolean.TRUE.equals(slot.getWeek().getIsPublished());
        return SlotResponse.builder()
                .id(slot.getId())
                .weekId(slot.getWeek().getId())
                .weekNumber(slot.getWeek().getWeekNumber())
                .assignmentId(a.getId())
                .day(slot.getDay())
                .session(slot.getSession())
                .period(slot.getPeriod())
                .specialRoomId(slot.getSpecialRoom() != null ? slot.getSpecialRoom().getId() : null)
                .subjectId(a.getSubject().getId())
                .subjectName(published ? slot.getSubjectNameSnapshot() : a.getSubject().getName())
                .teacherId(published ? slot.getTeacherIdSnapshot() : (a.getTeacher() != null ? a.getTeacher().getId() : null))
                .teacherName(published ? slot.getTeacherNameSnapshot() : (a.getTeacher() != null ? a.getTeacher().getFullName() : null))
                .classId(a.getSchoolClass().getId())
                .className(a.getSchoolClass().getName())
                .grade(a.getSchoolClass().getGrade())
                .build();
    }
}
