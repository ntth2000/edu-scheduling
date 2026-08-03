package com.eduschedule.service;

import com.eduschedule.dto.request.SpecialRoomRequest;
import com.eduschedule.dto.response.SpecialRoomResponse;
import com.eduschedule.entity.SpecialRoom;
import com.eduschedule.entity.Subject;
import com.eduschedule.entity.User;
import com.eduschedule.repository.SpecialRoomRepository;
import com.eduschedule.repository.SubjectRepository;
import com.eduschedule.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpecialRoomService {
    private final SpecialRoomRepository specialRoomRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    public List<SpecialRoomResponse> getAll() {
        return specialRoomRepository.findAllByUserId(getCurrentUser().getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SpecialRoomResponse create(SpecialRoomRequest request) {
        User user = getCurrentUser();
        if (specialRoomRepository.existsByNameAndUserId(request.getName(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phòng '" + request.getName() + "' đã tồn tại");
        }
        Subject subject = resolveSubject(request.getSubjectId(), user);
        if (subject != null && specialRoomRepository.existsBySubjectIdAndUserId(subject.getId(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Môn '" + subject.getName() + "' đã được gắn với một phòng chức năng khác");
        }
        SpecialRoom room = SpecialRoom.builder()
                .user(user)
                .name(request.getName())
                .quantity(request.getQuantity())
                .subject(subject)
                .build();
        return toResponse(specialRoomRepository.save(room));
    }

    @Transactional
    public SpecialRoomResponse update(Long id, SpecialRoomRequest request) {
        SpecialRoom room = findById(id);
        User user = getCurrentUser();
        if (!room.getName().equals(request.getName())
                && specialRoomRepository.existsByNameAndUserId(request.getName(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phòng '" + request.getName() + "' đã tồn tại");
        }
        Subject subject = resolveSubject(request.getSubjectId(), user);
        if (subject != null
                && specialRoomRepository.existsBySubjectIdAndUserIdAndIdNot(subject.getId(), user.getId(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Môn '" + subject.getName() + "' đã được gắn với một phòng chức năng khác");
        }
        room.setName(request.getName());
        room.setQuantity(request.getQuantity());
        room.setSubject(subject);
        return toResponse(specialRoomRepository.save(room));
    }

    @Transactional
    public void delete(Long id) {
        findById(id);
        specialRoomRepository.deleteById(id);
    }

    private Subject resolveSubject(Long subjectId, User user) {
        if (subjectId == null) return null;
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy môn học"));
        if (!subject.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Môn học không thuộc về người dùng này");
        }
        return subject;
    }

    private SpecialRoom findById(Long id) {
        SpecialRoom room = specialRoomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng chức năng"));
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!room.getUser().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return room;
    }

    private User getCurrentUser() {
        String username = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Người dùng không tồn tại"));
    }

    private SpecialRoomResponse toResponse(SpecialRoom room) {
        return SpecialRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .quantity(room.getQuantity())
                .subjectId(room.getSubject() != null ? room.getSubject().getId() : null)
                .subjectName(room.getSubject() != null ? room.getSubject().getName() : null)
                .build();
    }
}
