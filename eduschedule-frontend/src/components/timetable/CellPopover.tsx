"use client";

import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { type Slot, DAYS } from "@/lib/timetable-data";
import { Trash2, AlertTriangle, ChevronLeft } from "lucide-react";
import { type AssignmentResponse } from "@/lib/api";
import { type Subject, type SchoolClass } from "@/lib/types";

interface CellPopoverProps {
  children: React.ReactNode;
  slot: Slot | undefined;
  day: number;
  period: number;
  classId: string;
  allSlots: Slot[];
  onAddSlot: (params: {
    assignmentId?: number;
    classNumericId?: number;
    subjectNumericId?: number;
    day: number;
    period: number;
    subjectName: string;
    teacherId: string | null;
    teacherName: string | null;
    subjectId: string;
    classId: string;
  }) => void;
  onDeleteSlot: (slotId: string) => void;
  readOnly?: boolean;
  subjects: Subject[];
  assignments: AssignmentResponse[];
  currentClass?: SchoolClass;
}

interface SubjectOption {
  subject: Subject;
  assignmentId?: number;
  teacherId: string | null;
  teacherName: string | null;
  remaining: number;
  hasConflict: boolean;
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
  const [picking, setPicking] = useState(false);

  const dayLabel = DAYS.find((d) => d.value === day)?.label ?? "";
  const gradeIndex = currentClass ? currentClass.grade - 1 : 3;

  const options: SubjectOption[] = useMemo(() => {
    const otherSlots = allSlots.filter((s) => s.id !== slot?.id);
    const classSlots = otherSlots.filter((s) => s.classId === classId);

    return subjects
      .filter((s) => s.periodsByGrade[gradeIndex] > 0)
      .map((s) => {
        const used = classSlots.filter((sl) => sl.subjectId === s.id.toString()).length;
        const assignment = assignments.find(
          (a) => a.className === classId && a.subjectId === s.id
        );
        const max = assignment?.periodsPerWeek ?? s.periodsByGrade[gradeIndex];
        const remaining = max - used;

        const teacherId = assignment
          ? (assignment.teacherId != null ? assignment.teacherId.toString() : null)
          : currentClass?.homeroomTeacherId?.toString() ?? null;
        const teacherName = assignment
          ? assignment.teacherName
          : currentClass?.homeroomTeacher ?? null;

        // Only flag conflict for explicit BM assignments — GVCN subjects never cross-class conflict
        const hasConflict = assignment && teacherId
          ? otherSlots.some(
              (sl) =>
                sl.day === day &&
                sl.period === period &&
                sl.teacherId === teacherId
            )
          : false;

        return {
          subject: s,
          assignmentId: assignment?.id,
          teacherId,
          teacherName,
          remaining,
          hasConflict,
        };
      })
      .sort((a, b) => {
        if (a.remaining > 0 && b.remaining <= 0) return -1;
        if (a.remaining <= 0 && b.remaining > 0) return 1;
        return 0;
      });
  }, [subjects, allSlots, classId, slot, assignments, day, period, gradeIndex, currentClass]);

  const handleSelect = (opt: SubjectOption) => {
    if (opt.remaining <= 0) return;
    if (opt.assignmentId) {
      onAddSlot({
        assignmentId: opt.assignmentId,
        day,
        period,
        classId,
        subjectId: opt.subject.id.toString(),
        subjectName: opt.subject.name,
        teacherId: opt.teacherId,
        teacherName: opt.teacherName,
      });
    } else {
      onAddSlot({
        classNumericId: currentClass?.id,
        subjectNumericId: opt.subject.id,
        day,
        period,
        classId,
        subjectId: opt.subject.id.toString(),
        subjectName: opt.subject.name,
        teacherId: opt.teacherId,
        teacherName: opt.teacherName,
      });
    }
    setOpen(false);
    setPicking(false);
  };

  const handleClose = () => {
    setOpen(false);
    setPicking(false);
  };

  const renderPickerContent = (title: string, showBack: boolean) => (
    <PopoverContent className="w-72 p-0 rounded-xl overflow-hidden z-10000" align="start">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => setPicking(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <p className="font-semibold text-sm text-slate-800">{title}</p>
            <p className="text-[11px] text-slate-400">
              {dayLabel} · Tiết {period} · Lớp {classId}
            </p>
          </div>
        </div>
      </div>

      {/* Subject list */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
        {options.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-6">
            Không có môn nào có thể xếp
          </p>
        ) : (
          options.map((opt) => {
            const disabled = opt.remaining <= 0;
            return (
              <button
                key={opt.subject.id}
                disabled={disabled}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-2 ${
                  disabled
                    ? "opacity-40 cursor-not-allowed bg-white"
                    : "hover:bg-md-primary/5 cursor-pointer bg-white"
                }`}
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-slate-800">
                    {opt.subject.name}
                  </span>
                  <span className="text-[11px] text-slate-400 ml-1.5">
                    {opt.teacherName ?? "GVCN"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {opt.hasConflict && !disabled && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                  {disabled ? (
                    <span className="text-[11px] text-slate-300 font-medium">đủ rồi</span>
                  ) : (
                    <span className="text-[11px] text-slate-500 font-medium">
                      còn {opt.remaining}t
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-slate-100">
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleClose}>
          Huỷ
        </Button>
      </div>
    </PopoverContent>
  );

  if (readOnly) {
    return <>{children}</>;
  }

  // Empty cell → open picker directly
  if (!slot) {
    return (
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPicking(false); }}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        {renderPickerContent("Xếp tiết", false)}
      </Popover>
    );
  }

  // Filled cell
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPicking(false); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      {picking ? (
        renderPickerContent("Đổi môn học", true)
      ) : (
        <PopoverContent className="w-56 p-4 rounded-xl z-10000" align="start">
          <p className="font-semibold text-sm text-slate-800">{slot.subjectName}</p>
          <p className="text-[11px] text-slate-400 mb-2">
            {dayLabel} · Tiết {period} · Lớp {classId}
          </p>

          {slot.teacherName ? (
            <p className="text-xs text-slate-600 mb-1">
              GV: <span className="font-medium">{slot.teacherName}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 mb-1 italic">GVCN dạy</p>
          )}

          {slot.isConflict && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-600 rounded-lg px-2.5 py-2 mb-3 text-xs mt-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              GV trùng lịch lớp khác
            </div>
          )}

          <div className="flex gap-2 border-t border-slate-100 pt-3 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setPicking(true)}
            >
              Đổi môn
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => {
                onDeleteSlot(slot.id);
                setOpen(false);
              }}
            >
              <Trash2 className="w-3 h-3" />
              Xóa
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
