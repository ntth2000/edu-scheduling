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

    private static final List<DefaultSubject> DEFAULTS = List.of(
            new DefaultSubject("Tiếng Việt", 12, 10, 7, 7, 7),
            new DefaultSubject("Toán", 3, 5, 5, 5, 5),
            new DefaultSubject("Đạo đức", 1, 1, 1, 1, 1),
            new DefaultSubject("Ngoại ngữ 1", 0, 0, 4, 4, 4),
            new DefaultSubject("Tự nhiên và Xã hội", 2, 2, 2, 0, 0),
            new DefaultSubject("Lịch sử và Địa lí", 0, 0, 0, 2, 2),
            new DefaultSubject("Khoa học", 0, 0, 0, 2, 2),
            new DefaultSubject("Tin học", 0, 0, 1, 1, 1),
            new DefaultSubject("Công nghệ", 0, 0, 1, 1, 1),
            new DefaultSubject("Giáo dục thể chất", 2, 2, 2, 2, 2),
            new DefaultSubject("Âm nhạc", 1, 1, 1, 1, 1),
            new DefaultSubject("Mĩ thuật", 1, 1, 1, 1, 1),
            new DefaultSubject("Hoạt động trải nghiệm", 3, 3, 3, 3, 3),
            new DefaultSubject("Tiếng dân tộc thiểu số", 0, 0, 0, 0, 0)
    );

    private final SubjectRepository subjectRepository;

    @Transactional
    public void seedForUser(User user) {
        List<Subject> subjects = DEFAULTS.stream()
                .map(config -> Subject.builder()
                        .user(user)
                        .name(config.name())
                        .periodsGrade1(config.grade1())
                        .periodsGrade2(config.grade2())
                        .periodsGrade3(config.grade3())
                        .periodsGrade4(config.grade4())
                        .periodsGrade5(config.grade5())
                        .build())
                .toList();
        subjectRepository.saveAll(subjects);
    }

    private record DefaultSubject(
            String name,
            int grade1,
            int grade2,
            int grade3,
            int grade4,
            int grade5
    ) {
    }
}
