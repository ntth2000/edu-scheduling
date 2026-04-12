package com.eduschedule.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class BatchDeleteCascadeResponse {
    private int deletedTeachers;
    private int deletedAssignments;
    private int deletedSlots;
    private List<String> unsetHomeroomClasses;
}
