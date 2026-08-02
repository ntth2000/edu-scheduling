package com.eduschedule.service;

import com.eduschedule.dto.request.TimetableRequest;
import com.eduschedule.dto.response.TimetableResponse;
import com.eduschedule.dto.response.WeekPublishStatusResponse;
import com.eduschedule.entity.SchoolYear;
import com.eduschedule.entity.Timetable;
import com.eduschedule.entity.User;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.SchoolYearRepository;
import com.eduschedule.repository.TimetableRepository;
import com.eduschedule.repository.UserRepository;
import com.eduschedule.repository.WeekRepository;

import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimetableService {
    private final TimetableRepository timetableRepository;
    private final SchoolYearRepository schoolYearRepository;
    private final WeekRepository weekRepository;
    private final WeekService weekService;
    private final UserRepository userRepository;

    public List<TimetableResponse> getAll() {
        return timetableRepository.findAll().stream()
                .sorted(Comparator.comparing((Timetable t) -> t.getSchoolYear().getStartYear())
                        .thenComparing(Timetable::getSemesterOrder))
                .map(this::toResponse)
                .toList();
    }

    public List<TimetableResponse> getBySchoolYear(Long schoolYearId) {
        return timetableRepository.findBySchoolYearId(schoolYearId).stream()
                .map(this::toResponse)
                .toList();
    }

    public TimetableResponse getById(Long id) {
        return timetableRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy thời khoá biểu với id: " + id));
    }

    @Transactional
    public TimetableResponse create(TimetableRequest request) {
        SchoolYear schoolYear = schoolYearRepository.findById(request.getSchoolYearId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy năm học với id: " + request.getSchoolYearId()));

        Timetable timetable = Timetable.builder()
                .schoolYear(schoolYear)
                .semesterOrder(request.getSemesterOrder())
                .build();
        return toResponse(timetableRepository.save(timetable));
    }

    // Đặt lại đúng tập tuần đang công khai thành `weekIds` (không chỉ thêm): tuần nào đang
    // công khai mà không có trong danh sách mới sẽ bị bỏ công khai. Gọi với danh sách rỗng
    // tương đương thu hồi công khai toàn bộ — khớp luồng FE: bỏ tick hết checkbox rồi xác nhận.
    @Transactional
    public TimetableResponse publish(Long id, List<Long> weekIds) {
        Timetable timetable = findByIdWithOwnership(id);
        List<Long> targetIds = weekIds == null ? List.of() : weekIds;

        List<Week> allWeeks = weekRepository.findByTimetableIdOrderByWeekNumber(id);
        List<Long> allWeekIds = allWeeks.stream().map(Week::getId).toList();
        if (!allWeekIds.containsAll(targetIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Có tuần không thuộc thời khoá biểu này");
        }

        for (Week week : allWeeks) {
            if (!targetIds.contains(week.getId())) continue;
            WeekService.WeekEligibility eligibility = weekService.getPublishEligibility(week.getId());
            if (!eligibility.eligible()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Tuần " + week.getWeekNumber() + " chưa thể công khai: " + eligibility.reason());
            }
        }

        for (Week week : allWeeks) {
            week.setIsPublished(targetIds.contains(week.getId()));
        }
        weekRepository.saveAll(allWeeks);

        if (targetIds.isEmpty()) {
            timetable.setIsPublic(false);
        } else {
            if (timetable.getPublicToken() == null) {
                timetable.setPublicToken(UUID.randomUUID().toString());
            }
            timetable.setIsPublic(true);
        }
        return toResponse(timetableRepository.save(timetable));
    }

    @Transactional
    public void unpublishWeek(Long id, Long weekId) {
        findByIdWithOwnership(id);
        Week week = weekRepository.findById(weekId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tuần với id: " + weekId));
        if (!week.getTimetable().getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tuần không thuộc thời khoá biểu này");
        }
        week.setIsPublished(false);
        weekRepository.save(week);
    }

    public List<WeekPublishStatusResponse> getPublishStatus(Long id) {
        findByIdWithOwnership(id);
        return weekRepository.findByTimetableIdOrderByWeekNumber(id).stream()
                .map(week -> {
                    boolean published = Boolean.TRUE.equals(week.getIsPublished());
                    WeekService.WeekEligibility eligibility = published
                            ? new WeekService.WeekEligibility(true, null)
                            : weekService.getPublishEligibility(week.getId());
                    return WeekPublishStatusResponse.builder()
                            .weekId(week.getId())
                            .weekNumber(week.getWeekNumber())
                            .isPublished(published)
                            .eligible(eligibility.eligible())
                            .reason(eligibility.reason())
                            .build();
                })
                .toList();
    }

    private Timetable findByIdWithOwnership(Long id) {
        Timetable timetable = timetableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy thời khoá biểu với id: " + id));
        User user = getCurrentUser();
        if (!timetable.getSchoolYear().getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Không có quyền thao tác trên thời khoá biểu này");
        }
        return timetable;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không tồn tại"));
    }

    private TimetableResponse toResponse(Timetable t) {
        SchoolYear sy = t.getSchoolYear();
        LocalDate semesterStartDate = t.getWeeks().stream()
                .filter(w -> w.getWeekNumber() == 1)
                .findFirst()
                .map(Week::getStartDate)
                .orElse(null);
        return TimetableResponse.builder()
                .id(t.getId())
                .schoolYearId(sy.getId())
                .schoolYearName(sy.getStartYear() + "-" + (sy.getStartYear() + 1))
                .semesterOrder(t.getSemesterOrder())
                .semesterStartDate(semesterStartDate)
                .isPublic(t.getIsPublic())
                .publicToken(t.getPublicToken())
                .build();
    }
}
