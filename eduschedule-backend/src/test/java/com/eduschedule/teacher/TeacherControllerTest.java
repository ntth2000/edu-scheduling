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

    // GV-01: Tạo GV chủ nhiệm
    @Test
    void GV_01_createHomeroomTeacher() throws Exception {
        Cookie auth = loginAndGetCookie();

        mockMvc.perform(post("/api/teachers")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", "Nguyễn Văn A", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 20))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn A"))
                .andExpect(jsonPath("$.type").value("CHU_NHIEM"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    // GV-02: Tạo GV bộ môn kèm môn dạy
    @Test
    void GV_02_createSubjectTeacherWithSubjects() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long subjectId = getOrCreateSubjectId(auth);

        mockMvc.perform(post("/api/teachers")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", "Nguyễn Thị B", "type", "BO_MON",
                                        "maxPeriodsPerWeek", 20, "subjectIds", List.of(subjectId)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("BO_MON"))
                .andExpect(jsonPath("$.subjects").isArray())
                .andExpect(jsonPath("$.subjects.length()").value(1));
    }

    // GV-03: Cập nhật thông tin GV
    @Test
    void GV_03_updateTeacher() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn C", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 20));

        mockMvc.perform(put("/api/teachers/" + id)
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", "Nguyễn Văn C Mới", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 18))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyễn Văn C Mới"))
                .andExpect(jsonPath("$.maxPeriodsPerWeek").value(18));
    }

    // GV-04: Toggle GV inactive → chỉ đổi isActive, KHÔNG xoá slots/assignments
    @Test
    void GV_04_toggleInactive_noDelete() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn D", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 20));

        mockMvc.perform(patch("/api/teachers/" + id + "/toggle-status").cookie(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teacher.isActive").value(false))
                .andExpect(jsonPath("$.deletedSlots").value(0))
                .andExpect(jsonPath("$.deletedAssignments").value(0));
    }

    // GV-05: Toggle GV lại active
    @Test
    void GV_05_toggleBackActive() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn E", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 20));

        mockMvc.perform(patch("/api/teachers/" + id + "/toggle-status").cookie(auth))
                .andExpect(jsonPath("$.teacher.isActive").value(false));

        mockMvc.perform(patch("/api/teachers/" + id + "/toggle-status").cookie(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teacher.isActive").value(true));
    }

    // GV-06: GV inactive vẫn xuất hiện trong list với isActive=false
    @Test
    void GV_06_inactiveTeacherHasActiveFalse() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn F", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 20));

        mockMvc.perform(patch("/api/teachers/" + id + "/toggle-status").cookie(auth));

        var result = mockMvc.perform(get("/api/teachers").cookie(auth))
                .andExpect(status().isOk())
                .andReturn();

        var teachers = objectMapper.readTree(result.getResponse().getContentAsString());
        boolean found = false;
        for (var t : teachers) {
            if (t.get("id").asLong() == id) {
                assert !t.get("isActive").asBoolean() : "GV phải có isActive=false";
                found = true;
            }
        }
        assert found : "GV inactive vẫn phải xuất hiện trong danh sách";
    }

    // GV-07: Xoá batch nhiều GV
    @Test
    void GV_07_batchDelete() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id1 = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn G1", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 20));
        Long id2 = createTeacher(auth,
                Map.of("fullName", "Nguyễn Văn G2", "type", "CHU_NHIEM", "maxPeriodsPerWeek", 20));

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
