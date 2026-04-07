package com.eduschedule.service;

import com.eduschedule.dto.request.SchoolOffPeriodRequest;
import com.eduschedule.dto.response.SchoolOffPeriodResponse;
import com.eduschedule.entity.SchoolOffPeriod;
import com.eduschedule.repository.SchoolOffPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SchoolOffPeriodService {

    private final SchoolOffPeriodRepository repository;

    public List<SchoolOffPeriodResponse> getAll() {
        List<SchoolOffPeriod> all = repository.findAll();

        Map<Integer, List<SchoolOffPeriod>> grouped = all
                .stream()
                .collect(Collectors.groupingBy(
                        SchoolOffPeriod::getDay
                ));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> SchoolOffPeriodResponse.builder()
                        .day(entry.getKey())
                        .dayName(getDayName(entry.getKey()))
                        .periods(
                                entry.getValue().stream()
                                        .map(SchoolOffPeriod::getPeriod)
                                        .sorted()
                                        .toList()
                        )
                        .description(
                                entry.getValue().get(0).getDescription()
                        )
                        .build()
                )
                .toList();
    }

    @Transactional
    public SchoolOffPeriodResponse setOffPeriods(
            SchoolOffPeriodRequest request
    ) {
        request.getPeriods().forEach(period -> {
            if (period < 1 || period > 7) {
                throw new RuntimeException(
                        "Tiết phải từ 1 đến 7"
                );
            }
        });

        List<SchoolOffPeriod> existing = repository
                .findByDay(request.getDay());
        repository.deleteAll(existing);

        List<SchoolOffPeriod> newPeriods = request
                .getPeriods().stream()
                .map(period -> SchoolOffPeriod.builder()
                        .day(request.getDay())
                        .period(period)
                        .description(request.getDescription())
                        .build()
                )
                .toList();

        repository.saveAll(newPeriods);

        return SchoolOffPeriodResponse.builder()
                .day(request.getDay())
                .dayName(getDayName(request.getDay()))
                .periods(request.getPeriods().stream()
                        .sorted().toList())
                .description(request.getDescription())
                .build();
    }

    @Transactional
    public void clearByDay(Integer day) {
        List<SchoolOffPeriod> existing =
                repository.findByDay(day);
        repository.deleteAll(existing);
    }

    public boolean isOffPeriod(Integer day, Integer period) {
        return repository.existsByDayAndPeriod(day, period);
    }

    private String getDayName(Integer day) {
        return switch (day) {
            case 2 -> "Thứ Hai";
            case 3 -> "Thứ Ba";
            case 4 -> "Thứ Tư";
            case 5 -> "Thứ Năm";
            case 6 -> "Thứ Sáu";
            default -> "Không xác định";
        };
    }
}