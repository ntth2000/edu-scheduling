package com.eduschedule.service;

import ai.timefold.solver.core.api.score.HardSoftScore;
import ai.timefold.solver.core.api.solver.SolutionManager;
import ai.timefold.solver.core.api.solver.SolverFactory;
import com.eduschedule.dto.response.WeekResponse;
import com.eduschedule.entity.Assignment;
import com.eduschedule.entity.SchoolClass;
import com.eduschedule.entity.Slot;
import com.eduschedule.entity.SpecialRoom;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.AssignmentRepository;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.SpecialRoomRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.WeekRepository;
import com.eduschedule.scheduler.solver.Lesson;
import com.eduschedule.scheduler.solver.Timeslot;
import com.eduschedule.scheduler.solver.Timetable;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WeekService {
    private final WeekRepository weekRepository;
    private final SlotRepository slotRepository;
    private final AssignmentRepository assignmentRepository;
    private final SpecialRoomRepository specialRoomRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final SubjectRepository subjectRepository;
    private final SolverFactory<Timetable> solverFactory;

    public record WeekEligibility(boolean eligible, String reason) {
    }

    public List<WeekResponse> getByTimetable(Long timetableId) {
        return weekRepository.findByTimetableIdOrderByWeekNumber(timetableId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<WeekResponse> updateStartDate(Long weekId, LocalDate newStartDate) {
        if (newStartDate.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu phải là thứ 2");
        }

        Week week = weekRepository.findById(weekId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tuần với id: " + weekId));

        Long timetableId = week.getTimetable().getId();
        int baseWeekNumber = week.getWeekNumber();

        // Fetch week N and all subsequent weeks, then cascade +7 days per week
        List<Week> weeksToUpdate = weekRepository
                .findByTimetableIdAndWeekNumberGreaterThanEqualOrderByWeekNumber(timetableId, baseWeekNumber);

        for (Week w : weeksToUpdate) {
            long offset = (long) (w.getWeekNumber() - baseWeekNumber) * 7;
            w.setStartDate(newStartDate.plusDays(offset));
        }

        return weekRepository.saveAll(weeksToUpdate)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void applyFromWeek(Long sourceWeekId) {
        Week sourceWeek = weekRepository.findById(sourceWeekId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tuần với id: " + sourceWeekId));

        Long timetableId = sourceWeek.getTimetable().getId();
        int sourceWeekNumber = sourceWeek.getWeekNumber();

        List<Week> targetWeeks = weekRepository
                .findByTimetableIdAndWeekNumberGreaterThanEqualOrderByWeekNumber(
                        timetableId, sourceWeekNumber + 1);

        if (targetWeeks.isEmpty()) {
            return;
        }

        List<Integer> publishedWeekNumbers = targetWeeks.stream()
                .filter(Week::getIsPublished)
                .map(Week::getWeekNumber)
                .toList();
        if (!publishedWeekNumbers.isEmpty()) {
            boolean plural = publishedWeekNumbers.size() > 1;
            String message = "Không thể áp dụng thay đổi từ tuần " + sourceWeekNumber + "\n"
                    + formatWeekList(publishedWeekNumbers) + " đã được công bố và đang bị khóa. "
                    + "Vui lòng hủy công bố " + (plural ? "các tuần này" : "tuần này")
                    + " trước khi áp dụng thay đổi, hoặc chỉ lưu thay đổi cho tuần " + sourceWeekNumber + ".";
            throw new ResponseStatusException(HttpStatus.CONFLICT, message);
        }

        List<Slot> sourceSlots = slotRepository.findByWeekId(sourceWeekId);

        List<Long> targetWeekIds = targetWeeks.stream().map(Week::getId).toList();
        slotRepository.deleteByWeekIdIn(targetWeekIds);

        List<Slot> copies = new ArrayList<>();
        for (Week target : targetWeeks) {
            for (Slot src : sourceSlots) {
                copies.add(Slot.builder()
                        .week(target)
                        .assignment(src.getAssignment())
                        .specialRoom(src.getSpecialRoom())
                        .day(src.getDay())
                        .session(src.getSession())
                        .period(src.getPeriod())
                        .build());
            }
        }
        slotRepository.saveAll(copies);
    }

    // "Tuần 8" / "Tuần 8 và tuần 9" / "Tuần 8, tuần 9 và tuần 10".
    private String formatWeekList(List<Integer> weekNumbers) {
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < weekNumbers.size(); i++) {
            parts.add((i == 0 ? "Tuần " : "tuần ") + weekNumbers.get(i));
        }
        if (parts.size() == 1) {
            return parts.get(0);
        }
        String last = parts.remove(parts.size() - 1);
        return String.join(", ", parts) + " và " + last;
    }

    // Publish eligibility = (a) for every class×subject in the school year, the number of slots
    // placed in this week equals the subject's current per-grade quota exactly (too few and too
    // many both fail), and (b) the existing slots violate none of TimetableConstraintProvider's hard
    // constraints. Reuses the same solver machinery as ScheduleGeneratorService/TimefoldPhase
    // instead of re-implementing conflict detection, so this never drifts from what "generate"
    // considers valid.
    public WeekEligibility getPublishEligibility(Long weekId) {
        Week week = weekRepository.findById(weekId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tuần với id: " + weekId));

        Long schoolYearId = week.getTimetable().getSchoolYear().getId();
        Long userId = week.getTimetable().getSchoolYear().getUser().getId();
        List<Assignment> allAssignments = assignmentRepository.findBySchoolClassSchoolYearId(schoolYearId);
        List<Slot> existingSlots = slotRepository.findByWeekId(weekId);
        Map<Long, SpecialRoom> subjectToRoom = specialRoomRepository.findAllByUserId(userId).stream()
                .filter(r -> r.getSubject() != null)
                .collect(Collectors.toMap(r -> r.getSubject().getId(), r -> r, (a, b) -> a));

        Map<String, Long> scheduledByClassSubject = existingSlots.stream()
                .filter(s -> s.getAssignment() != null)
                .collect(Collectors.groupingBy(
                        s -> classSubjectKey(s.getAssignment().getSchoolClass().getId(),
                                s.getAssignment().getSubject().getId()),
                        Collectors.counting()));

        List<SchoolClass> classes = schoolClassRepository.findAllBySchoolYearId(schoolYearId);
        List<Subject> subjects = subjectRepository.findAllByUserId(userId);

        for (SchoolClass cls : classes) {
            for (Subject subject : subjects) {
                int required = periodsForGrade(subject, cls.getGrade());
                if (required == 0) continue;
                int scheduled = scheduledByClassSubject
                        .getOrDefault(classSubjectKey(cls.getId(), subject.getId()), 0L)
                        .intValue();
                if (scheduled != required) {
                    return new WeekEligibility(false, "Số tiết chưa đúng định mức");
                }
            }
        }

        if (!isHardConstraintClean(existingSlots, allAssignments, subjectToRoom)) {
            return new WeekEligibility(false, "Còn vi phạm ràng buộc bắt buộc");
        }

        return new WeekEligibility(true, null);
    }

    private boolean isHardConstraintClean(List<Slot> existingSlots, List<Assignment> allAssignments,
                                          Map<Long, SpecialRoom> subjectToRoom) {
        if (existingSlots.isEmpty()) {
            return true;
        }

        Map<Long, Assignment> assignmentMap = allAssignments.stream()
                .collect(Collectors.toMap(Assignment::getId, a -> a, (a, b) -> a));

        List<Timeslot> timeslotList = Timeslot.generateAll();
        Map<String, Timeslot> timeslotIndex = new HashMap<>();
        for (Timeslot ts : timeslotList) {
            timeslotIndex.put(timeslotKey(ts.getDay(), ts.getSession(), ts.getPeriod()), ts);
        }

        List<Lesson> lessonList = new ArrayList<>();
        Map<Long, Integer> occurrence = new HashMap<>();
        for (Slot slot : existingSlots) {
            if (slot.getAssignment() == null) continue;
            Assignment a = assignmentMap.get(slot.getAssignment().getId());
            if (a == null) continue;

            // Slots in DB use flat period (1-7); solver's Timeslot uses within-session period.
            int flatPeriod = slot.getPeriod();
            int session = flatPeriod <= 4 ? 1 : 2;
            int withinPeriod = flatPeriod <= 4 ? flatPeriod : flatPeriod - 4;

            int idx = occurrence.merge(a.getId(), 1, Integer::sum) - 1;
            SpecialRoom room = subjectToRoom.get(a.getSubject().getId());
            lessonList.add(Lesson.builder()
                    .id(a.getId() + "-" + idx)
                    .assignmentId(a.getId())
                    .classId(a.getSchoolClass().getId())
                    .className(a.getSchoolClass().getName())
                    .teacherId(a.getTeacher() != null ? a.getTeacher().getId() : null)
                    .teacherFullName(a.getTeacher() != null ? a.getTeacher().getFullName() : null)
                    .subjectId(a.getSubject().getId())
                    .subjectName(a.getSubject().getName())
                    .specialRoomId(room != null ? room.getId() : null)
                    .specialRoomCapacity(room != null ? room.getQuantity() : null)
                    .pinned(true)
                    .timeslot(timeslotIndex.get(timeslotKey(slot.getDay(), session, withinPeriod)))
                    .build());
        }

        Timetable solution = new Timetable(timeslotList, lessonList);
        SolutionManager<Timetable, HardSoftScore> solutionManager = SolutionManager.create(solverFactory);
        HardSoftScore score = solutionManager.update(solution);
        return score.isFeasible();
    }

    private String timeslotKey(int day, int session, int period) {
        return day + "_" + session + "_" + period;
    }

    private String classSubjectKey(Long classId, Long subjectId) {
        return classId + "_" + subjectId;
    }

    private int periodsForGrade(Subject s, Integer grade) {
        if (grade == null) return 0;
        Integer periods = switch (grade) {
            case 1 -> s.getPeriodsGrade1();
            case 2 -> s.getPeriodsGrade2();
            case 3 -> s.getPeriodsGrade3();
            case 4 -> s.getPeriodsGrade4();
            case 5 -> s.getPeriodsGrade5();
            default -> 0;
        };
        return periods != null ? periods : 0;
    }

    private WeekResponse toResponse(Week w) {
        LocalDate start = w.getStartDate();
        return WeekResponse.builder()
                .id(w.getId())
                .weekNumber(w.getWeekNumber())
                .startDate(start)
                .endDate(start != null ? start.plusDays(6) : null)
                .isPublished(w.getIsPublished())
                .build();
    }
}
