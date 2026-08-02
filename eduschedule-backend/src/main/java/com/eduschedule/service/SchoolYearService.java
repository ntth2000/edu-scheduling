package com.eduschedule.service;

import com.eduschedule.dto.request.SchoolYearRequest;
import com.eduschedule.dto.response.SchoolYearResponse;
import com.eduschedule.entity.SchoolYear;
import com.eduschedule.entity.Timetable;
import com.eduschedule.entity.User;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.SchoolClassRepository;
import com.eduschedule.repository.SchoolYearRepository;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.TimetableRepository;
import com.eduschedule.repository.UserRepository;
import com.eduschedule.repository.WeekRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolYearService {

    private static final int WEEKS_HK1 = 18;
    private static final int WEEKS_HK2 = 17;

    private final SchoolYearRepository schoolYearRepository;
    private final TimetableRepository timetableRepository;
    private final WeekRepository weekRepository;
    private final UserRepository userRepository;
    private final SchoolClassRepository schoolClassRepository;
    private final SlotRepository slotRepository;

    public List<SchoolYearResponse> getAll(String username) {
        User user = getUser(username);
        return schoolYearRepository.findAllByUserIdOrderByStartYearDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SchoolYearResponse create(SchoolYearRequest request, String username) {
        User user = getUser(username);

        if (schoolYearRepository.existsByStartYearAndUserId(request.getStartYear(), user.getId())) {
            String name = request.getStartYear() + "-" + (request.getStartYear() + 1);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Năm học " + name + " đã tồn tại");
        }

        SchoolYear schoolYear = schoolYearRepository.save(
                SchoolYear.builder().user(user).startYear(request.getStartYear()).build());

        createTimetableWithWeeks(schoolYear, 1, WEEKS_HK1);
        createTimetableWithWeeks(schoolYear, 2, WEEKS_HK2);

        return toResponse(schoolYear);
    }

    @Transactional
    public void delete(Long id, String username) {
        User user = getUser(username);
        SchoolYear schoolYear = schoolYearRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Năm học không tồn tại"));

        if (!schoolYear.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền xóa năm học này");
        }

        if (schoolClassRepository.existsBySchoolYearId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể xóa năm học đã có lớp học");
        }

        if (slotRepository.existsByWeek_Timetable_SchoolYearId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể xóa năm học đã có thời khóa biểu");
        }

        timetableRepository.deleteAll(timetableRepository.findBySchoolYearId(id));
        schoolYearRepository.delete(schoolYear);
    }

    private void createTimetableWithWeeks(SchoolYear schoolYear, int semesterOrder, int weekCount) {
        Timetable timetable = timetableRepository.save(
                Timetable.builder().schoolYear(schoolYear).semesterOrder(semesterOrder).build());

        int weekOffset = semesterOrder == 1 ? 0 : WEEKS_HK1;
        List<Week> weeks = new ArrayList<>();
        for (int i = 1; i <= weekCount; i++) {
            weeks.add(Week.builder().timetable(timetable).weekNumber(weekOffset + i).startDate(null).build());
        }
        weekRepository.saveAll(weeks);
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Người dùng không tồn tại"));
    }

    private SchoolYearResponse toResponse(SchoolYear sy) {
        return SchoolYearResponse.builder()
                .id(sy.getId())
                .name(sy.getStartYear() + "-" + (sy.getStartYear() + 1))
                .startYear(sy.getStartYear())
                .build();
    }
}
