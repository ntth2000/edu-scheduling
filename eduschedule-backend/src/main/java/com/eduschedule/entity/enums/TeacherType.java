package com.eduschedule.entity;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum TeacherType {
    @JsonProperty("BO_MON")
    GVBM,

    @JsonProperty("CHU_NHIEM") // Ví dụ tương tự
    GVCN
}
