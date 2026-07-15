package com.eduschedule.service;

import com.eduschedule.entity.Subject;
import com.eduschedule.entity.User;
import com.eduschedule.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DefaultSubjectSeeder {

    private static final String[] DEFAULTS = {
            "Tiếng Việt",
            "Toán",
            "Đạo đức",
            "Ngoại ngữ 1",
            "Tự nhiên và Xã hội",
            "Lịch sử và Địa lí",
            "Khoa học",
            "Tin học",
            "Giáo dục thể chất",
            "Âm nhạc",
            "Mĩ thuật",
            "Hoạt động trải nghiệm",
            "Công nghệ"
    };
    private final SubjectRepository subjectRepository;

    @Transactional
    public void seedForUser(User user) {
        List<Subject> subjects = java.util.Arrays.stream(DEFAULTS)
                .map(name -> Subject.builder()
                        .user(user)
                        .name(name)
                        .build())
                .toList();
        subjectRepository.saveAll(subjects);
    }
}
