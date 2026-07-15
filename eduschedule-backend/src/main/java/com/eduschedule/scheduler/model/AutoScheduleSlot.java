package com.eduschedule.scheduler.model;

public record AutoScheduleSlot(
        int day,
        int period,       // flat 1-7 (matches frontend convention)
        String className,
        long classId,
        long subjectId,
        String subjectName,
        Long teacherId,
        String teacherName,
        long assignmentId
) {}
