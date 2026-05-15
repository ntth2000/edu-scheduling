package com.eduschedule.controller;

import com.eduschedule.dto.request.SchoolYearRequest;
import com.eduschedule.dto.response.SchoolYearResponse;
import com.eduschedule.entity.SchoolYear;
import com.eduschedule.entity.User;
import com.eduschedule.repository.SchoolYearRepository;
import com.eduschedule.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/school-years")
@RequiredArgsConstructor
public class SchoolYearController {

    private final SchoolYearRepository schoolYearRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<SchoolYearResponse>> getAll() {
        Long userId = getCurrentUser().getId();
        return ResponseEntity.ok(
                schoolYearRepository.findAllByUserIdOrderByStartYearDesc(userId)
                        .stream()
                        .map(this::toResponse)
                        .toList()
        );
    }

    @PostMapping
    public ResponseEntity<SchoolYearResponse> create(@Valid @RequestBody SchoolYearRequest request) {
        User user = getCurrentUser();

        if (schoolYearRepository.existsByStartYearAndUserId(request.getStartYear(), user.getId())) {
            String name = request.getStartYear() + "-" + (request.getStartYear() + 1);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Năm học " + name + " đã tồn tại");
        }

        SchoolYear schoolYear = SchoolYear.builder()
                .user(user)
                .startYear(request.getStartYear())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(schoolYearRepository.save(schoolYear)));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không tồn tại"));
    }

    private SchoolYearResponse toResponse(SchoolYear sy) {
        return SchoolYearResponse.builder()
                .id(sy.getId())
                .name(sy.getStartYear() + "-" + (sy.getStartYear() + 1))
                .startYear(sy.getStartYear())
                .build();
    }
}
