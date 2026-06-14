package com.eduschedule.service;

import com.eduschedule.dto.response.WeekResponse;
import com.eduschedule.entity.Slot;
import com.eduschedule.entity.Week;
import com.eduschedule.repository.SlotRepository;
import com.eduschedule.repository.WeekRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WeekService {
    private final WeekRepository weekRepository;
    private final SlotRepository slotRepository;

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

    private WeekResponse toResponse(Week w) {
        LocalDate start = w.getStartDate();
        return WeekResponse.builder()
                .id(w.getId())
                .weekNumber(w.getWeekNumber())
                .startDate(start)
                .endDate(start != null ? start.plusDays(4) : null)
                .build();
    }
}
