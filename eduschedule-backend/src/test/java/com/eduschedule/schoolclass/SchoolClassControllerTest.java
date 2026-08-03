package com.eduschedule.schoolclass;

import com.eduschedule.BaseControllerTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SchoolClassControllerTest extends BaseControllerTest {

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
        var body = schoolYearId != null
                ? Map.of("name", name, "grade", grade, "schoolYearId", schoolYearId)
                : Map.of("name", name, "grade", grade);
        var result = mockMvc.perform(post("/api/classes")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    // LOP-01: Tạo lớp học
    @Test
    void LOP_01_createClass() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);

        mockMvc.perform(post("/api/classes")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "3A", "grade", 3, "schoolYearId", schoolYearId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("3A"))
                .andExpect(jsonPath("$.grade").value(3));
    }

    // LOP-02: Tạo lớp trùng tên trong cùng năm → 409
    @Test
    void LOP_02_duplicateClassNameSameYear() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);
        createClass(auth, "3A", 3, schoolYearId);

        mockMvc.perform(post("/api/classes")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "3A", "grade", 3, "schoolYearId", schoolYearId))))
                .andExpect(status().isConflict());
    }

    // LOP-03: Tạo lớp trùng tên khác năm → thành công
    @Test
    void LOP_03_sameNameDifferentYear() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long year2024 = createSchoolYear(auth, 2024);
        Long year2025 = createSchoolYear(auth, 2025);

        createClass(auth, "3A", 3, year2024);

        // Tạo cùng tên năm khác → ok
        mockMvc.perform(post("/api/classes")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "3A", "grade", 3, "schoolYearId", year2025))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("3A"));
    }

    // LOP-04: Cập nhật lớp học
    @Test
    void LOP_04_updateClass() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);
        Long id = createClass(auth, "3A", 3, schoolYearId);

        mockMvc.perform(put("/api/classes/" + id)
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "3A sửa", "grade", 3, "schoolYearId", schoolYearId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("3A sửa"));
    }

    // LOP-05: Xoá lớp không có dữ liệu
    @Test
    void LOP_05_deleteClassWithNoData() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);
        Long id = createClass(auth, "3B", 3, schoolYearId);

        mockMvc.perform(delete("/api/classes/" + id).cookie(auth))
                .andExpect(status().isNoContent());
    }

    // LOP-06: Xoá lớp đã có assignment → block hoặc cascade
    @Test
    void LOP_06_deleteClassWithAssignment() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);
        Long classId = createClass(auth, "3C", 3, schoolYearId);

        // Tạo GV chủ nhiệm
        var teacherResult = mockMvc.perform(post("/api/teachers")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("fullName", "GV CN 3C", "maxPeriodsPerWeek", 20))))
                .andExpect(status().isOk())
                .andReturn();
        Long teacherId = objectMapper.readTree(teacherResult.getResponse().getContentAsString()).get("id").asLong();

        // Phân công GVCN cho lớp
        mockMvc.perform(put("/api/classes/" + classId)
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "3C", "grade", 3, "schoolYearId", schoolYearId,
                                        "homeroomTeacherId", teacherId))))
                .andExpect(status().isOk());

        // Xoá lớp → backend cascade delete hoặc block
        var deleteResult = mockMvc.perform(delete("/api/classes/" + classId).cookie(auth))
                .andReturn();
        int status = deleteResult.getResponse().getStatus();
        // Chấp nhận cả cascade-delete (204) hoặc block (4xx) — tùy implementation
        assert status == 204 || (status >= 400 && status < 500)
                : "Xoá lớp có ràng buộc phải trả về 204 (cascade) hoặc 4xx (block), nhận: " + status;
    }
}
