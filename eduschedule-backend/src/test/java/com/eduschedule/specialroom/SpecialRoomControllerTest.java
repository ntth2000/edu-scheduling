package com.eduschedule.specialroom;

import com.eduschedule.BaseControllerTest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SpecialRoomControllerTest extends BaseControllerTest {

    private Long createSubject(Cookie auth) throws Exception {
        var result = mockMvc.perform(post("/api/subjects")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Tin học Test",
                                "periodsGrade1", 1, "periodsGrade2", 1, "periodsGrade3", 1,
                                "periodsGrade4", 1, "periodsGrade5", 1
                        ))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long createRoom(Cookie auth, String name, int quantity, Long subjectId) throws Exception {
        var body = subjectId != null
                ? Map.of("name", name, "quantity", quantity, "subjectId", subjectId)
                : Map.of("name", name, "quantity", quantity);
        var result = mockMvc.perform(post("/api/special-rooms")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    // PHONG-01: Tạo phòng chức năng
    @Test
    void PHONG_01_createSpecialRoom() throws Exception {
        Cookie auth = loginAndGetCookie();

        mockMvc.perform(post("/api/special-rooms")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Phòng máy tính", "quantity", 1))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Phòng máy tính"))
                .andExpect(jsonPath("$.quantity").value(1));
    }

    // PHONG-02: Tạo phòng gắn với môn học
    @Test
    void PHONG_02_createRoomWithSubject() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long subjectId = createSubject(auth);

        mockMvc.perform(post("/api/special-rooms")
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("name", "Phòng Tin", "quantity", 2, "subjectId", subjectId))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjectId").value(subjectId));
    }

    // PHONG-03: Cập nhật số lượng phòng
    @Test
    void PHONG_03_updateRoomQuantity() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id = createRoom(auth, "Phòng Nghệ thuật", 1, null);

        mockMvc.perform(put("/api/special-rooms/" + id)
                        .cookie(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Phòng Nghệ thuật", "quantity", 2))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(2));
    }

    // PHONG-04: Xoá phòng chức năng
    @Test
    void PHONG_04_deleteSpecialRoom() throws Exception {
        Cookie auth = loginAndGetCookie();
        Long id = createRoom(auth, "Phòng Thể chất", 1, null);

        mockMvc.perform(delete("/api/special-rooms/" + id).cookie(auth))
                .andExpect(status().isNoContent());

        // Verify it's gone
        mockMvc.perform(get("/api/special-rooms").cookie(auth))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    var list = objectMapper.readTree(result.getResponse().getContentAsString());
                    for (var room : list) {
                        assert room.get("id").asLong() != id : "Phòng đã xoá không được xuất hiện";
                    }
                });
    }
}
