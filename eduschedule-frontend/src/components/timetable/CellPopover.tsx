"use client";

import { useState, useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  type Slot,
  checkConflict,
  DAYS,
} from "@/lib/timetable-data";
import { Pencil, Trash2, AlertTriangle, ChevronLeft } from "lucide-react";

import { type AssignmentResponse } from "@/lib/api";
import { type Subject, type SchoolClass } from "@/lib/types";

interface CellPopoverProps {
  children: React.ReactNode;
  slot: Slot | undefined;
  day: number;
  period: number;
  classId: string;
  allSlots: Slot[];
  onAddSlot: (params: { assignmentId?: number; classNumericId?: number; subjectNumericId?: number; day: number; period: number; subjectName: string; teacherId: string | null; teacherName: string | null; subjectId: string; classId: string }) => void;
  onDeleteSlot: (slotId: string) => void;
  readOnly?: boolean;
  subjects: Subject[];
  assignments: AssignmentResponse[];
  currentClass?: SchoolClass;
}

export function CellPopover({
  children,
  slot,
  day,
  period,
  classId,
  allSlots,
  onAddSlot,
  onDeleteSlot,
  readOnly = false,
  subjects,
  assignments,
  currentClass,
}: CellPopoverProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const skipAutoSelectRef = useRef(false);

  const dayLabel = DAYS.find((d) => d.value === day)?.label || "";
  const gradeIndex = currentClass ? currentClass.grade - 1 : 3;

  // Reset state when popover closes
  useEffect(() => {
    if (!open) {
      setEditing(false);
      setSelectedSubjectId("");
      setSelectedTeacherId(null);
    }
  }, [open]);

  // When entering edit mode, pre-fill with current slot values
  const enterEditMode = () => {
    skipAutoSelectRef.current = true;
    setSelectedSubjectId(slot?.subjectId ?? "");
    setSelectedTeacherId(slot?.teacherId ?? null);
    setEditing(true);
  };

  // Show all subjects with periods > 0 for this grade, excluding those that reached weekly quota
  const classSlots = allSlots.filter((s) => s.classId === classId && s.id !== slot?.id);
  const filteredSubjects = subjects.filter((s) => {
    if (s.periodsByGrade[gradeIndex] <= 0) return false;

    // Count how many slots this subject already has in the class
    const usedPeriods = classSlots.filter((sl) => sl.subjectId === s.id.toString()).length;

    // Find the assignment to get the weekly quota
    const assignment = assignments.find(
      (a) => a.className === classId && a.subjectId === s.id
    );
    const maxPeriods = assignment?.periodsPerWeek ?? s.periodsByGrade[gradeIndex];

    return usedPeriods < maxPeriods;
  });

  // Assignment for the currently selected subject
  const assignmentForSubject = assignments.find(
    (a) => a.className === classId && a.subjectId.toString() === selectedSubjectId
  );

  // Build teacher list: assigned teacher + GVCN (if different)
  const teachersForSubject: { id: string; name: string; isGvcn: boolean }[] = [];
  if (assignmentForSubject) {
    teachersForSubject.push({
      id: assignmentForSubject.teacherId.toString(),
      name: assignmentForSubject.teacherName,
      isGvcn: false,
    });
  }
  if (currentClass?.homeroomTeacherId) {
    const gvcnId = currentClass.homeroomTeacherId.toString();
    if (!teachersForSubject.some((t) => t.id === gvcnId)) {
      teachersForSubject.push({
        id: gvcnId,
        name: `${currentClass.homeroomTeacher} (GVCN)`,
        isGvcn: true,
      });
    }
  }

  // Auto-select teacher when subject changes
  useEffect(() => {
    if (skipAutoSelectRef.current) {
      skipAutoSelectRef.current = false;
      return;
    }
    if (selectedSubjectId) {
      const assignment = assignments.find(
        (a) => a.className === classId && a.subjectId.toString() === selectedSubjectId
      );
      if (assignment) {
        setSelectedTeacherId(assignment.teacherId.toString());
      } else if (currentClass?.homeroomTeacherId) {
        setSelectedTeacherId(currentClass.homeroomTeacherId.toString());
      } else {
        setSelectedTeacherId(null);
      }
    }
  }, [selectedSubjectId, classId, assignments, currentClass]);

  const conflict =
    selectedSubjectId && selectedTeacherId
      ? checkConflict(
        { day, period, classId, teacherId: selectedTeacherId },
        allSlots.filter((s) => s.id !== slot?.id)
      )
      : { hasConflict: false };

  const handleSave = () => {
    const subject = filteredSubjects.find((s) => s.id.toString() === selectedSubjectId);
    if (!subject || !selectedTeacherId) return;

    const teacher = teachersForSubject.find((t) => t.id === selectedTeacherId);
    if (!teacher) return;

    if (teacher.isGvcn || !assignmentForSubject) {
      // GVCN path: send classId + subjectId, backend finds/creates assignment with GVCN
      if (!currentClass?.homeroomTeacherId) return;
      onAddSlot({
        classNumericId: currentClass.id,
        subjectNumericId: subject.id,
        day,
        period,
        classId,
        subjectId: subject.id.toString(),
        subjectName: subject.name,
        teacherId: currentClass.homeroomTeacherId.toString(),
        teacherName: currentClass.homeroomTeacher,
      });
    } else {
      // Assignment path: send assignmentId
      onAddSlot({
        assignmentId: assignmentForSubject.id,
        day,
        period,
        classId,
        subjectId: subject.id.toString(),
        subjectName: subject.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
      });
    }
    setOpen(false);
  };

  // Shared edit/add form
  const renderForm = (title: string) => (
    <PopoverContent className="w-64 p-4 rounded-xl" align="start">
      <div className="flex items-center gap-2 mb-3">
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div>
          <p className="font-semibold text-base font-heading leading-tight">{title}</p>
          <p className="text-xs text-md-on-surface/50">
            {dayLabel} &bull; Tiết {period} &bull; Lớp {classId}
          </p>
        </div>
      </div>

      {/* Subject select */}
      <div className="mb-3">
        <label className="text-[11px] uppercase tracking-[0.05em] font-medium text-md-on-surface/60 block mb-1">
          Môn học *
        </label>
        <select
          value={selectedSubjectId}
          onChange={(e) => {
            setSelectedSubjectId(e.target.value);
            setSelectedTeacherId(null);
          }}
          className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-md-primary bg-slate-50"
        >
          <option value="">-- Chọn môn --</option>
          {filteredSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Teacher select */}
      {selectedSubjectId && teachersForSubject.length > 0 && (
        <div className="mb-4">
          <label className="text-[11px] uppercase tracking-[0.05em] font-medium text-md-on-surface/60 block mb-1">
            Giáo viên *
          </label>
          <select
            value={selectedTeacherId || ""}
            onChange={(e) => setSelectedTeacherId(e.target.value || null)}
            className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-md-primary bg-slate-50"
          >
            <option value="">-- Chọn GV --</option>
            {teachersForSubject.map((t) => {
              const busy = allSlots.some(
                (s) => s.day === day && s.period === period && s.teacherId === t.id && s.id !== slot?.id
              );
              return (
                <option key={t.id} value={t.id} disabled={busy}>
                  {t.name}
                  {busy ? " (Đang bận)" : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Conflict warning */}
      {conflict.hasConflict && (
        <div className="bg-md-error-container rounded-lg p-2 mb-3 text-xs text-md-error flex gap-1 items-start">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{conflict.reason}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => editing ? setEditing(false) : setOpen(false)}
        >
          Hủy
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-linear-to-br from-md-primary to-md-primary-container text-white rounded-xl"
          disabled={
            !selectedSubjectId ||
            conflict.hasConflict ||
            !selectedTeacherId
          }
          onClick={handleSave}
        >
          {editing ? "Lưu thay đổi" : "Xếp tiết"}
        </Button>
      </div>
    </PopoverContent>
  );

  // Popover for FILLED cell
  if (slot) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        {editing ? (
          renderForm("Đổi môn học")
        ) : (
          <PopoverContent className="w-56 p-4 rounded-xl" align="start">
            <p className="font-semibold text-base font-heading">{slot.subjectName}</p>
            <p className="text-xs text-md-on-surface/50 mb-1">
              {dayLabel} &bull; Tiết {period} &bull; Lớp {classId}
            </p>
            {slot.teacherId && slot.teacherId !== currentClass?.homeroomTeacherId?.toString() ? (
              <p className="text-sm text-md-primary mb-3">
                GV: {slot.teacherName} (Bộ môn)
              </p>
            ) : (
              <p className="text-sm text-slate-500 mb-3">GVCN dạy</p>
            )}

            {slot.isConflict && (
              <div className="bg-md-error-container rounded-lg p-2 mb-3 text-xs text-md-error flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                GV trùng lịch lớp khác
              </div>
            )}

            {!readOnly && (
              <div className="flex gap-2 border-t border-md-outline-variant/20 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-1 text-xs"
                  onClick={enterEditMode}
                >
                  <Pencil className="w-3 h-3" /> Đổi
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-1 text-xs text-md-error hover:bg-md-error-container"
                  onClick={() => {
                    onDeleteSlot(slot.id);
                    setOpen(false);
                  }}
                >
                  <Trash2 className="w-3 h-3" /> Xóa
                </Button>
              </div>
            )}
          </PopoverContent>
        )}
      </Popover>
    );
  }

  if (readOnly) {
    return <>{children}</>;
  }

  // Popover for EMPTY cell
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {renderForm("Xếp tiết")}
    </Popover>
  );
}
