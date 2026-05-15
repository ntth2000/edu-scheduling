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

    private final SubjectRepository subjectRepository;

    private static final String[][] DEFAULTS = {
        { "Tiếng Việt",            "TV"   },
        { "Toán",                  "T"    },
        { "Đạo đức",               "ĐĐ"   },
        { "Ngoại ngữ 1",           "NN1"  },
        { "Tự nhiên và Xã hội",    "TNXH" },
        { "Lịch sử và Địa lí",     "LSĐL" },
        { "Khoa học",              "KH"   },
        { "Tin học và Công nghệ",  "THCN" },
        { "Giáo dục thể chất",     "GDTC" },
        { "Âm nhạc",               "AN"   },
        { "Mĩ thuật",              "MT"   },
        { "Hoạt động trải nghiệm", "HĐTN" },
    };

    @Transactional
    public void seedForUser(User user) {
        List<Subject> subjects = java.util.Arrays.stream(DEFAULTS)
                .map(row -> Subject.builder()
                        .user(user)
                        .name(row[0])
                        .shortName(row[1])
                        .build())
                .toList();
        subjectRepository.saveAll(subjects);
    }
}
