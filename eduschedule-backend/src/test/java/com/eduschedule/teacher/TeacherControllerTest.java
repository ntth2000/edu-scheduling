package com.eduschedule.teacher;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TeacherControllerTest {

    @Autowired MockMvc mockMvc;
    ObjectMapper objectMapper = new ObjectMapper();

    private static final AtomicInteger counter = new AtomicInteger(0);

    /** Đăng ký + đăng nhập, trả về access_token cookie để dùng trong test */
    private Cookie loginAndGetCookie() throws Exception {
        String username = "gvtest_" + counter.incrementAndGet();
        var creds = Map.of("username", username, "password", "password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(creds)))
                .andExpect(status().isCreated());

        var result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(creds)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("accessToken").asText();
        return new Cookie("access_token", accessToken);
    }

    private Long createTeacher(Cookie auth, Map<String, Object> request) throws Exception {
        var result = mockMvc.perform(post("/api/teachers")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long getOrCreateSubjectId(Cookie auth) throws Exception {
        var result = mockMvc.perform(get("/api/subjects").cookie(auth)).andReturn();
        var subjects = objectMapper.readTree(result.getResponse().getContentAsString());
        if (subjects.isArray() && subjects.size() > 0) {
            return subjects.get(0).get("id").asLong();
        }
        var createResult = mockMvc.perform(post("/api/subjects")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "Toán",
                                        "periodsGrade1", 4, "periodsGrade2", 4, "periodsGrade3", 4,
                                        "periodsGrade4", 4, "periodsGrade5", 4))))
                .andReturn();
        return objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createSchoolYear(Cookie auth) throws Exception {
        int startYear = 2000 + (int) (counter.incrementAndGet() % 90);
        var result = mockMvc.perform(post("/api/school-years")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("startYear", startYear))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createClass(Cookie auth, String name, int grade, Long schoolYearId) throws Exception {
        return createClass(auth, name, grade, schoolYearId, null);
    }

    private Long createClass(Cookie auth, String name, int grade, Long schoolYearId, Long homeroomTeacherId) throws Exception {
        var body = new java.util.HashMap<String, Object>();
        body.put("name", name);
        body.put("grade", grade);
        body.put("schoolYearId", schoolYearId);
        body.put("homeroomTeacherId", homeroomTeacherId);
        var result = mockMvc.perform(post("/api/classes")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createAssignment(Cookie auth, Long classId, Long subjectId, Long teacherId) throws Exception {
        var result = mockMvc.perform(post("/api/assignments")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("classId", classId, "subjectId", subjectId, "teacherId", teacherId))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long getWeek1Id(Cookie auth, Long schoolYearId) throws Exception {
        var timetablesResult = mockMvc.perform(get("/api/timetables?schoolYearId=" + schoolYearId).cookie(auth))
                .andReturn();
        var timetables = objectMapper.readTree(timetablesResult.getResponse().getContentAsString());
        long timetableId = -1;
        for (var t : timetables) {
            if (t.get("semesterOrder").asInt() == 1) {
                timetableId = t.get("id").asLong();
                break;
            }
        }
        var weeksResult = mockMvc.perform(get("/api/weeks?timetableId=" + timetableId).cookie(auth))
                .andReturn();
        var weeks = objectMapper.readTree(weeksResult.getResponse().getContentAsString());
        for (var w : weeks) {
            if (w.get("weekNumber").asInt() == 1) {
                return w.get("id").asLong();
            }
        }
        throw new IllegalStateException("Week 1 not found");
    }

    private void createSlot(Cookie auth, Long weekId, Long assignmentId, int day, int session, int period) throws Exception {
        mockMvc.perform(post("/api/slots")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("weekId", weekId, "assignmentId", assignmentId,
                                        "day", day, "session", session, "period", period))))
                .andExpect(status().isOk());
    }

    // GV-01: Tạo giáo viên
    @Test
    void GV_01_createTeacher() throws Exception {
        Cookie auth = loginAndGetCookie();

        mockMvc.perform(post("/api/teachers")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", "Nguyễn Văn A", "maxPeriodsPerWeek", 20))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn A"));
    }

    // GV-02: Tạo GV kèm môn dạy
    @Test
    void GV_02_createSubjectTeacherWithSubjects() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long subjectId = getOrCreateSubjectId(auth);

        mockMvc.perform(post("/api/teachers")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", "Nguyễn Thị B",
                                        "maxPeriodsPerWeek", 20, "subjectIds", List.of(subjectId)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjects").isArray())
                .andExpect(jsonPath("$.subjects.length()").value(1));
    }

    // GV-03: Cập nhật thông tin GV
    @Test
    void GV_03_updateTeacher() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn C", "maxPeriodsPerWeek", 20));

        mockMvc.perform(put("/api/teachers/" + id)
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", "Nguyễn Văn C Mới", "maxPeriodsPerWeek", 18))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn C Mới"))
                .andExpect(jsonPath("$.maxPeriodsPerWeek").value(18));
    }

    // GV-04: Xoá GV đã được phân công nhưng chưa xếp TKB → xoá thành công,
    // phân công liên quan cũng bị xoá theo.
    @Test
    void GV_04_deleteTeacherWithUnscheduledAssignment_cascadesAssignment() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long subjectId = getOrCreateSubjectId(auth);
        Long teacherId = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn D",
                        "maxPeriodsPerWeek", 20, "subjectIds", List.of(subjectId)));
        Long schoolYearId = createSchoolYear(auth);
        Long classId = createClass(auth, "GV04A", 1, schoolYearId);
        createAssignment(auth, classId, subjectId, teacherId);

        mockMvc.perform(delete("/api/teachers/batch")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(teacherId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedTeachers").value(1))
                .andExpect(jsonPath("$.deletedAssignments").value(1));

        mockMvc.perform(get("/api/teachers").cookie(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + teacherId + ")]").isEmpty());
    }

    // GV-05: Xoá GV đã có tiết được xếp trong TKB → bị chặn, không xoá.
    @Test
    void GV_05_deleteScheduledTeacher_isBlocked() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long subjectId = getOrCreateSubjectId(auth);
        Long teacherId = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn E",
                        "maxPeriodsPerWeek", 20, "subjectIds", List.of(subjectId)));
        Long schoolYearId = createSchoolYear(auth);
        Long classId = createClass(auth, "GV05A", 1, schoolYearId);
        Long assignmentId = createAssignment(auth, classId, subjectId, teacherId);
        Long weekId = getWeek1Id(auth, schoolYearId);
        createSlot(auth, weekId, assignmentId, 2, 1, 1);

        mockMvc.perform(delete("/api/teachers/batch")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(teacherId))))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/teachers").cookie(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + teacherId + ")]").isNotEmpty());
    }

    // GV-06: Xoá GV đang là GVCN của một lớp → bị chặn, không xoá.
    @Test
    void GV_06_deleteHomeroomTeacher_isBlocked() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long teacherId = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn F", "maxPeriodsPerWeek", 20));
        Long schoolYearId = createSchoolYear(auth);
        createClass(auth, "GV06A", 1, schoolYearId, teacherId);

        mockMvc.perform(delete("/api/teachers/batch")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(teacherId))))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/teachers").cookie(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + teacherId + ")]").isNotEmpty());
    }

    // GV-07: Xoá batch nhiều GV
    @Test
    void GV_07_batchDelete() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id1 = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn G1", "maxPeriodsPerWeek", 20));
        Long id2 = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn G2", "maxPeriodsPerWeek", 20));

        mockMvc.perform(delete("/api/teachers/batch")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(id1, id2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deletedTeachers").value(2));

        var result = mockMvc.perform(get("/api/teachers").cookie(auth))
                .andExpect(status().isOk())
                .andReturn();
        var list = objectMapper.readTree(result.getResponse().getContentAsString());
        for (var t : list) {
            assert t.get("id").asLong() != id1 && t.get("id").asLong() != id2
                    : "GV đã xoá không được xuất hiện trong danh sách";
        }
    }
}
