package com.eduschedule.service;

import com.eduschedule.dto.request.TimetableRequest;
import com.eduschedule.dto.response.TimetableResponse;
import com.eduschedule.entity.Timetable;
import com.eduschedule.repository.TimetableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TimetableService {
    private final TimetableRepository timetableRepository;

    public List<TimetableResponse> getAll() {
        return timetableRepository.findAll().stream()
                .sorted(Comparator.comparing(Timetable::getCreatedAt).reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TimetableResponse create(TimetableRequest request) {
        Timetable timetable = Timetable.builder()
                .name(request.getName())
                .status("DRAFT")
                .build();
        return toResponse(timetableRepository.save(timetable));
    }

    @Transactional
    public TimetableResponse updateStatus(Long id, String status) {
        Timetable timetable = timetableRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thời khoá biểu với id: " + id));
        timetable.setStatus(status);
        if ("PUBLISHED".equals(status)) {
            timetable.setPublishedAt(LocalDateTime.now());
        }
        return toResponse(timetableRepository.save(timetable));
    }

    private TimetableResponse toResponse(Timetable t) {
        return TimetableResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .status(t.getStatus())
                .publishedAt(t.getPublishedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
