package com.eduschedule.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class TeacherCascadeResponse {
    private TeacherResponse teacher;
    private int deletedAssignments;
    private int deletedSlots;
    private List<String> unsetHomeroomClasses;
}
