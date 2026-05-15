package com.eduschedule.service;

import com.eduschedule.dto.request.TimetableRequest;
import com.eduschedule.dto.response.TimetableResponse;
import com.eduschedule.entity.SchoolYear;
import com.eduschedule.entity.Timetable;
import com.eduschedule.repository.SchoolYearRepository;
import com.eduschedule.repository.TimetableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimetableService {
    private final TimetableRepository timetableRepository;
    private final SchoolYearRepository schoolYearRepository;

    public List<TimetableResponse> getAll() {
        return timetableRepository.findAll().stream()
                .sorted(Comparator.comparing(Timetable::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    public List<TimetableResponse> getBySchoolYear(Long schoolYearId) {
        return timetableRepository.findBySchoolYearId(schoolYearId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TimetableResponse create(TimetableRequest request) {
        SchoolYear schoolYear = schoolYearRepository.findById(request.getSchoolYearId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy năm học với id: " + request.getSchoolYearId()));

        if (timetableRepository.existsBySchoolYearIdAndSemesterOrder(
                request.getSchoolYearId(), request.getSemesterOrder())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Thời khoá biểu học kì " + request.getSemesterOrder() + " đã tồn tại");
        }

        Timetable timetable = Timetable.builder()
                .schoolYear(schoolYear)
                .semesterOrder(request.getSemesterOrder())
                .offDay(request.getOffDay())
                .offSession(request.getOffSession())
                .status("DRAFT")
                .build();
        return toResponse(timetableRepository.save(timetable));
    }

    @Transactional
    public TimetableResponse updateStatus(Long id, String status) {
        Timetable timetable = timetableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy thời khoá biểu với id: " + id));
        timetable.setStatus(status);
        if ("PUBLISHED".equals(status)) {
            timetable.setPublishedAt(LocalDateTime.now());
        }
        return toResponse(timetableRepository.save(timetable));
    }

    private TimetableResponse toResponse(Timetable t) {
        SchoolYear sy = t.getSchoolYear();
        return TimetableResponse.builder()
                .id(t.getId())
                .schoolYearId(sy.getId())
                .schoolYearName(sy.getStartYear() + "-" + (sy.getStartYear() + 1))
                .semesterOrder(t.getSemesterOrder())
                .status(t.getStatus())
                .offDay(t.getOffDay())
                .offSession(t.getOffSession())
                .publishedAt(t.getPublishedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
