package com.eduschedule.schoolyear;

import com.eduschedule.BaseControllerTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SchoolYearControllerTest extends BaseControllerTest {

    private Long createSchoolYear(Cookie auth, int startYear) throws Exception {
        var result = mockMvc.perform(post("/api/school-years")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("startYear", startYear))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    // NAMHOC-01: Tạo năm học thành công
    @Test
    void NAMHOC_01_createSchoolYear() throws Exception {
        Cookie auth = loginAndGetCookie();

        mockMvc.perform(post("/api/school-years")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("startYear", 2025))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("2025-2026"))
                .andExpect(jsonPath("$.startYear").value(2025));
    }

    // NAMHOC-02: Auto tạo HK1 + HK2 (2 timetables)
    @Test
    void NAMHOC_02_autoCreateTwoTimetables() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);

        var result = mockMvc.perform(get("/api/timetables?schoolYearId=" + schoolYearId).cookie(auth))
                .andExpect(status().isOk())
                .andReturn();

        var timetables = objectMapper.readTree(result.getResponse().getContentAsString());
        assert timetables.isArray() : "Phải trả về array";
        assert timetables.size() == 2 : "Phải có đúng 2 timetable (HK1 + HK2), nhưng có " + timetables.size();
    }

    // NAMHOC-03: HK1 auto tạo 18 tuần
    @Test
    void NAMHOC_03_hk1Has18Weeks() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);

        var timetablesResult = mockMvc.perform(get("/api/timetables?schoolYearId=" + schoolYearId).cookie(auth))
                .andReturn();
        var timetables = objectMapper.readTree(timetablesResult.getResponse().getContentAsString());

        // Tìm HK1 (semesterOrder = 1)
        Long hk1Id = null;
        for (var t : timetables) {
            if (t.get("semesterOrder").asInt() == 1) {
                hk1Id = t.get("id").asLong();
                break;
            }
        }
        assert hk1Id != null : "Phải có HK1";

        var weeksResult = mockMvc.perform(get("/api/weeks?timetableId=" + hk1Id).cookie(auth))
                .andExpect(status().isOk())
                .andReturn();
        var weeks = objectMapper.readTree(weeksResult.getResponse().getContentAsString());
        assert weeks.size() == 18 : "HK1 phải có 18 tuần, nhưng có " + weeks.size();
    }

    // NAMHOC-04: HK2 auto tạo 17 tuần
    @Test
    void NAMHOC_04_hk2Has17Weeks() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long schoolYearId = createSchoolYear(auth, 2025);

        var timetablesResult = mockMvc.perform(get("/api/timetables?schoolYearId=" + schoolYearId).cookie(auth))
                .andReturn();
        var timetables = objectMapper.readTree(timetablesResult.getResponse().getContentAsString());

        Long hk2Id = null;
        for (var t : timetables) {
            if (t.get("semesterOrder").asInt() == 2) {
                hk2Id = t.get("id").asLong();
                break;
            }
        }
        assert hk2Id != null : "Phải có HK2";

        var weeksResult = mockMvc.perform(get("/api/weeks?timetableId=" + hk2Id).cookie(auth))
                .andExpect(status().isOk())
                .andReturn();
        var weeks = objectMapper.readTree(weeksResult.getResponse().getContentAsString());
        assert weeks.size() == 17 : "HK2 phải có 17 tuần, nhưng có " + weeks.size();
    }

    // NAMHOC-05: Tạo năm học trùng → 409
    @Test
    void NAMHOC_05_duplicateSchoolYear() throws Exception {
        Cookie auth = loginAndGetCookie();
        createSchoolYear(auth, 2025);

        mockMvc.perform(post("/api/school-years")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("startYear", 2025))))
                .andExpect(status().isConflict());
    }

    // NAMHOC-06: Xoá năm học (chưa implement endpoint DELETE trong backend)
    // NOTE: SchoolYearController hiện chưa có endpoint DELETE
    // @Test void NAMHOC_06_deleteEmptySchoolYear() - SKIPPED: endpoint not implemented

    // NAMHOC-07: Tương tự NAMHOC-06, endpoint chưa implement
    // @Test void NAMHOC_07_deleteSchoolYearWithData_shouldBlock() - SKIPPED: endpoint not implemented
}
