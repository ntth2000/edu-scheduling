package com.eduschedule.scheduler;

import com.eduschedule.BaseControllerTest;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ScheduleGeneratorControllerTest extends BaseControllerTest {

    // Every other create endpoint (subjects/teachers/classes/assignments) returns 200, not 201 —
    // only /api/school-years does.
    private long postForId(Cookie auth, String url, Object body) throws Exception {
        var result = mockMvc.perform(post(url)
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private long createSchoolYear(Cookie auth, int startYear) throws Exception {
        var result = mockMvc.perform(post("/api/school-years")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("startYear", startYear))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    // XEP_TKB-01: Sinh thời khoá biểu tự động cho 1 lớp không xung đột và đủ số tiết
    @Test
    void XEP_TKB_01_generateProducesFullFeasibleSchedule() throws Exception {
        Cookie auth = loginAndGetCookie();

        long schoolYearId = createSchoolYear(auth, 2025);

        var timetables = objectMapper.readTree(
                mockMvc.perform(get("/api/timetables?schoolYearId=" + schoolYearId).cookie(auth))
                        .andReturn().getResponse().getContentAsString());
        long hk1Id = -1;
        for (JsonNode t : timetables) {
            if (t.get("semesterOrder").asInt() == 1) hk1Id = t.get("id").asLong();
        }
        assert hk1Id != -1 : "Phải có HK1";

        var weeks = objectMapper.readTree(
                mockMvc.perform(get("/api/weeks?timetableId=" + hk1Id).cookie(auth))
                        .andReturn().getResponse().getContentAsString());
        long weekId = weeks.get(0).get("id").asLong();

        // Names deliberately don't match DefaultSubjectSeeder's defaults (seeded on register),
        // otherwise creating them here would 409 as duplicates.
        long mathSubjectId = postForId(auth, "/api/subjects", Map.of(
                "name", "Toán Test", "periodsGrade1", 4, "periodsGrade2", 0,
                "periodsGrade3", 0, "periodsGrade4", 0, "periodsGrade5", 0));
        long vietSubjectId = postForId(auth, "/api/subjects", Map.of(
                "name", "Tiếng Việt Test", "periodsGrade1", 3, "periodsGrade2", 0,
                "periodsGrade3", 0, "periodsGrade4", 0, "periodsGrade5", 0));

        long classId = postForId(auth, "/api/classes",
                Map.of("name", "1A", "grade", 1, "schoolYearId", schoolYearId));

        long mathTeacherId = postForId(auth, "/api/teachers", Map.of(
                "fullName", "Nguyễn Văn A", "type", "BO_MON", "maxPeriodsPerWeek", 20));
        long vietTeacherId = postForId(auth, "/api/teachers", Map.of(
                "fullName", "Trần Thị B", "type", "BO_MON", "maxPeriodsPerWeek", 20));

        mockMvc.perform(post("/api/assignments").cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "classId", classId, "subjectId", mathSubjectId, "teacherId", mathTeacherId))))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/assignments").cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "classId", classId, "subjectId", vietSubjectId, "teacherId", vietTeacherId))))
                .andExpect(status().isOk());

        var genResult = mockMvc.perform(post("/api/weeks/" + weekId + "/generate").cookie(auth))
                .andReturn();
        JsonNode body = objectMapper.readTree(genResult.getResponse().getContentAsString());

        assert body.get("errors").isEmpty()
                : "Không được có lỗi khi đủ chỗ trống: " + body.get("errors");
        assert body.get("slots").size() == 7
                : "Phải xếp đủ 4 Toán + 3 Tiếng Việt = 7 tiết, nhưng có " + body.get("slots").size();

        Set<String> classSlotKeys = new HashSet<>();
        Set<String> teacherSlotKeys = new HashSet<>();
        for (JsonNode slot : body.get("slots")) {
            int day = slot.get("day").asInt();
            int period = slot.get("period").asInt();
            long slotClassId = slot.get("classId").asLong();
            long teacherId = slot.get("teacherId").asLong();

            String classKey = slotClassId + "_" + day + "_" + period;
            assert classSlotKeys.add(classKey) : "Lớp bị trùng tiết: " + classKey;

            String teacherKey = teacherId + "_" + day + "_" + period;
            assert teacherSlotKeys.add(teacherKey) : "Giáo viên bị trùng tiết: " + teacherKey;

            assert day >= 2 && day <= 6 : "Ngày phải trong khoảng thứ 2-6: " + day;
            assert period >= 1 && period <= 7 : "Tiết phải trong khoảng 1-7: " + period;
        }
    }

    // XEP_TKB-02: Gọi lại generate khi đã xếp đủ -> trả về rỗng, không lỗi
    @Test
    void XEP_TKB_02_generateAgainWhenAlreadyFull() throws Exception {
        Cookie auth = loginAndGetCookie();

        long schoolYearId = createSchoolYear(auth, 2025);
        var timetables = objectMapper.readTree(
                mockMvc.perform(get("/api/timetables?schoolYearId=" + schoolYearId).cookie(auth))
                        .andReturn().getResponse().getContentAsString());
        long hk1Id = -1;
        for (JsonNode t : timetables) {
            if (t.get("semesterOrder").asInt() == 1) hk1Id = t.get("id").asLong();
        }
        var weeks = objectMapper.readTree(
                mockMvc.perform(get("/api/weeks?timetableId=" + hk1Id).cookie(auth))
                        .andReturn().getResponse().getContentAsString());
        long weekId = weeks.get(0).get("id").asLong();

        long subjectId = postForId(auth, "/api/subjects", Map.of(
                "name", "Toán Test", "periodsGrade1", 2, "periodsGrade2", 0,
                "periodsGrade3", 0, "periodsGrade4", 0, "periodsGrade5", 0));
        long classId = postForId(auth, "/api/classes",
                Map.of("name", "1A", "grade", 1, "schoolYearId", schoolYearId));
        long teacherId = postForId(auth, "/api/teachers", Map.of(
                "fullName", "Nguyễn Văn A", "type", "BO_MON", "maxPeriodsPerWeek", 20));
        mockMvc.perform(post("/api/assignments").cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "classId", classId, "subjectId", subjectId, "teacherId", teacherId))))
                .andExpect(status().isOk());

        // First call proposes both periods; /generate is read-only, so persist them the
        // same way the frontend does (one POST /api/slots per proposed slot) before re-generating.
        var first = mockMvc.perform(post("/api/weeks/" + weekId + "/generate").cookie(auth))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode firstBody = objectMapper.readTree(first.getResponse().getContentAsString());
        assert firstBody.get("slots").size() == 2 : "Phải xếp đủ 2 tiết Toán";

        for (JsonNode slot : firstBody.get("slots")) {
            int period = slot.get("period").asInt();
            mockMvc.perform(post("/api/slots").cookie(auth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "weekId", weekId,
                                    "assignmentId", slot.get("assignmentId").asLong(),
                                    "day", slot.get("day").asInt(),
                                    "session", period <= 4 ? 1 : 2,
                                    "period", period))))
                    .andExpect(status().isOk());
        }

        // Second call: nothing left to schedule -> empty slots, empty errors
        var second = mockMvc.perform(post("/api/weeks/" + weekId + "/generate").cookie(auth))
                .andReturn();
        JsonNode body = objectMapper.readTree(second.getResponse().getContentAsString());
        assert body.get("slots").isEmpty() : "Không còn tiết nào để xếp thêm";
        assert body.get("errors").isEmpty() : "Không nên có lỗi khi không còn gì để xếp";
    }

    // XEP_TKB-03: Buổi sáng phải xếp đủ 4 tiết trước khi được xếp sang buổi chiều.
    // 1 lớp với tổng 25 tiết/tuần (5 môn x 5 tiết) buộc phải dùng đến buổi chiều ở một vài
    // ngày — với mọi ngày có tiết chiều, 4 tiết sáng (1-4) phải có mặt đầy đủ trong kết quả.
    @Test
    void XEP_TKB_03_afternoonRequiresCompleteMorningSession() throws Exception {
        Cookie auth = loginAndGetCookie();

        long schoolYearId = createSchoolYear(auth, 2025);
        var timetables = objectMapper.readTree(
                mockMvc.perform(get("/api/timetables?schoolYearId=" + schoolYearId).cookie(auth))
                        .andReturn().getResponse().getContentAsString());
        long hk1Id = -1;
        for (JsonNode t : timetables) {
            if (t.get("semesterOrder").asInt() == 1) hk1Id = t.get("id").asLong();
        }
        var weeks = objectMapper.readTree(
                mockMvc.perform(get("/api/weeks?timetableId=" + hk1Id).cookie(auth))
                        .andReturn().getResponse().getContentAsString());
        long weekId = weeks.get(0).get("id").asLong();

        long classId = postForId(auth, "/api/classes",
                Map.of("name", "1A", "grade", 1, "schoolYearId", schoolYearId));

        for (int i = 1; i <= 5; i++) {
            long subjectId = postForId(auth, "/api/subjects", Map.of(
                    "name", "Môn Test " + i, "periodsGrade1", 5, "periodsGrade2", 0,
                    "periodsGrade3", 0, "periodsGrade4", 0, "periodsGrade5", 0));
            long teacherId = postForId(auth, "/api/teachers", Map.of(
                    "fullName", "GV Test " + i, "type", "BO_MON", "maxPeriodsPerWeek", 23));
            mockMvc.perform(post("/api/assignments").cookie(auth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "classId", classId, "subjectId", subjectId, "teacherId", teacherId))))
                    .andExpect(status().isOk());
        }

        var genResult = mockMvc.perform(post("/api/weeks/" + weekId + "/generate").cookie(auth))
                .andReturn();
        JsonNode body = objectMapper.readTree(genResult.getResponse().getContentAsString());

        Map<Integer, Set<Integer>> periodsByDay = new HashMap<>();
        for (JsonNode slot : body.get("slots")) {
            periodsByDay.computeIfAbsent(slot.get("day").asInt(), k -> new HashSet<>())
                    .add(slot.get("period").asInt());
        }

        boolean anyAfternoonUsed = false;
        for (Map.Entry<Integer, Set<Integer>> e : periodsByDay.entrySet()) {
            Set<Integer> periods = e.getValue();
            boolean hasAfternoon = periods.stream().anyMatch(p -> p > 4);
            if (!hasAfternoon) continue;
            anyAfternoonUsed = true;
            for (int morningPeriod = 1; morningPeriod <= 4; morningPeriod++) {
                assert periods.contains(morningPeriod)
                        : "Thứ " + e.getKey() + " có tiết chiều nhưng thiếu tiết sáng " + morningPeriod
                        + " (đã xếp: " + periods + ")";
            }
        }
        assert anyAfternoonUsed : "Bài test không có ý nghĩa nếu không ngày nào phải dùng buổi chiều";
    }
}
