package com.eduschedule.scheduler;

import com.eduschedule.scheduler.solver.Lesson;
import com.eduschedule.scheduler.solver.LessonDifficultyComparator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// The comparator sorts ascending (easiest first); the construction heuristic reads it backwards via
// EntitySorterManner.DESCENDING_IF_AVAILABLE. These tests assert the order the CH actually sees.
class LessonDifficultyComparatorTest {

    private final Comparator<Lesson> constructionHeuristicOrder =
            new LessonDifficultyComparator().reversed();

    private static Lesson lesson(String id, boolean pinned, int teacherClassCount,
                                 Long specialRoomId, boolean homeroomTeacher) {
        return Lesson.builder()
                .id(id)
                .pinned(pinned)
                .teacherClassCount(teacherClassCount)
                .specialRoomId(specialRoomId)
                .specialRoomCapacity(specialRoomId == null ? null : 2)
                .homeroomTeacher(homeroomTeacher)
                .build();
    }

    @Test
    @DisplayName("Đúng thứ tự yêu cầu: đã khoá → GVBM cần phòng chức năng → GVBM không cần phòng → GVCN")
    void placesLessonsInTheRequestedOrder() {
        Lesson homeroom = lesson("gvcn", false, 1, null, true);
        Lesson subjectTeacherNoRoom = lesson("gvbm-khong-phong", false, 5, null, false);
        Lesson subjectTeacherWithRoom = lesson("gvbm-can-phong", false, 5, 10L, false);
        Lesson pinned = lesson("da-khoa", true, 1, null, true);

        List<Lesson> lessons = new ArrayList<>(
                List.of(homeroom, subjectTeacherNoRoom, subjectTeacherWithRoom, pinned));
        lessons.sort(constructionHeuristicOrder);

        assertThat(lessons).extracting(Lesson::getId)
                .containsExactly("da-khoa", "gvbm-can-phong", "gvbm-khong-phong", "gvcn");
    }

    @Test
    @DisplayName("Tiết của GVCN xếp sau tiết của GVBM kể cả khi GVCN cần phòng chức năng")
    void alwaysPlacesHomeroomLessonsLast() {
        Lesson homeroomWithRoom = lesson("gvcn-can-phong", false, 1, 10L, true);
        Lesson subjectTeacherNoRoom = lesson("gvbm-khong-phong", false, 3, null, false);

        List<Lesson> lessons = new ArrayList<>(List.of(homeroomWithRoom, subjectTeacherNoRoom));
        lessons.sort(constructionHeuristicOrder);

        assertThat(lessons).extracting(Lesson::getId)
                .containsExactly("gvbm-khong-phong", "gvcn-can-phong");
    }

    @Test
    @DisplayName("Cùng bậc: giáo viên dạy nhiều lớp hơn được xếp trước")
    void breaksTiesByHowManyClassesTheTeacherCovers() {
        Lesson threeClasses = lesson("gv-3-lop", false, 3, null, false);
        Lesson sevenClasses = lesson("gv-7-lop", false, 7, null, false);

        List<Lesson> lessons = new ArrayList<>(List.of(threeClasses, sevenClasses));
        lessons.sort(constructionHeuristicOrder);

        assertThat(lessons).extracting(Lesson::getId).containsExactly("gv-7-lop", "gv-3-lop");
    }

    @Test
    @DisplayName("Thứ tự tất định giữa hai tiết giống hệt nhau")
    void isDeterministicForOtherwiseIdenticalLessons() {
        Lesson first = lesson("a", false, 1, null, true);
        Lesson second = lesson("b", false, 1, null, true);

        assertThat(constructionHeuristicOrder.compare(first, second)).isNotZero();
        assertThat(constructionHeuristicOrder.compare(first, second))
                .isEqualTo(-constructionHeuristicOrder.compare(second, first));
    }
}
