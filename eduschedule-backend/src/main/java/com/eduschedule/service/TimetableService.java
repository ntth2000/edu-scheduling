package com.eduschedule.service;

import com.eduschedule.dto.request.TimetableRequest;
import com.eduschedule.dto.response.TimetableResponse;
import com.eduschedule.entity.SchoolYear;
import com.eduschedule.entity.Timetable;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.SchoolYearRepository;
import com.eduschedule.repository.TimetableRepository;

import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
                .build();
    }
}
