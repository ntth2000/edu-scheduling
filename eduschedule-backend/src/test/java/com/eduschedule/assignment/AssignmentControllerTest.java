package com.eduschedule.assignment;

import com.eduschedule.BaseControllerTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AssignmentControllerTest extends BaseControllerTest {

    private Long createSchoolYear(Cookie auth, int startYear) throws Exception {
        var result = mockMvc.perform(post("/api/school-years")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("startYear", startYear))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createClass(Cookie auth, String name, int grade, Long schoolYearId) throws Exception {
        var result = mockMvc.perform(post("/api/classes")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", name, "grade", grade, "schoolYearId", schoolYearId))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createTeacher(Cookie auth, String fullName) throws Exception {
        var result = mockMvc.perform(post("/api/teachers")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", fullName, "maxPeriodsPerWeek", 20))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    // PC-01: Phân công GVCN cho lớp
    @Test
    void PC_01_assignHomeroom() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);
        Long classId = createClass(auth, "3A", 3, schoolYearId);
        Long teacherId = createTeacher(auth, "Nguyễn Văn A");

        mockMvc.perform(post("/api/assignments/homeroom")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("classId", classId, "teacherId", teacherId))))
                .andExpect(status().isNoContent());
    }

    // PC-02: Một giáo viên không thể chủ nhiệm 2 lớp trong cùng năm học
    @Test
    void PC_02_teacherCannotHeadTwoClassesSameYear() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);
        Long classA = createClass(auth, "3A", 3, schoolYearId);
        Long classB = createClass(auth, "3B", 3, schoolYearId);
        Long teacherId = createTeacher(auth, "Nguyễn Văn B");

        mockMvc.perform(post("/api/assignments/homeroom")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("classId", classA, "teacherId", teacherId))))
                .andExpect(status().isNoContent());

        Exception ex = assertThrows(Exception.class, () -> mockMvc.perform(post("/api/assignments/homeroom")
                .cookie(auth)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        Map.of("classId", classB, "teacherId", teacherId)))));
        assertTrue(ex.getMessage().contains("đã là GVCN của lớp 3A"));
    }

    // PC-03: Một giáo viên được phép chủ nhiệm 1 lớp ở mỗi năm học khác nhau — ràng buộc
    // "không trùng GVCN" chỉ tính trong cùng 1 năm học (đã sửa bug chặn nhầm qua các năm).
    @Test
    void PC_03_teacherCanHeadClassesInDifferentYears() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long year2024 = createSchoolYear(auth, 2024);
        Long year2025 = createSchoolYear(auth, 2025);
        Long classOldYear = createClass(auth, "3A", 3, year2024);
        Long classNewYear = createClass(auth, "4A", 4, year2025);
        Long teacherId = createTeacher(auth, "Nguyễn Văn C");

        mockMvc.perform(post("/api/assignments/homeroom")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("classId", classOldYear, "teacherId", teacherId))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/assignments/homeroom")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("classId", classNewYear, "teacherId", teacherId))))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/classes/" + classOldYear).cookie(auth))
                .andExpect(jsonPath("$.homeroomTeacherId").value(teacherId));
        mockMvc.perform(get("/api/classes/" + classNewYear).cookie(auth))
                .andExpect(jsonPath("$.homeroomTeacherId").value(teacherId));
    }

    // PC-04: Cho phép cập nhật lại GVCN của chính lớp đó (không tính là trùng)
    @Test
    void PC_04_reassignSameClassIsAllowed() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);
        Long classId = createClass(auth, "3A", 3, schoolYearId);
        Long teacherId = createTeacher(auth, "Nguyễn Văn D");

        mockMvc.perform(post("/api/assignments/homeroom")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("classId", classId, "teacherId", teacherId))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/assignments/homeroom")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("classId", classId, "teacherId", teacherId))))
                .andExpect(status().isNoContent());
    }
}
