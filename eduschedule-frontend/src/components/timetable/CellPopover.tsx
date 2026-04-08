"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  type Slot,
  availableSubjects,
  availableTeachersForSubject,
  checkConflict,
  DAYS,
} from "@/lib/timetable-data";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";

interface CellPopoverProps {
  children: React.ReactNode;
  slot: Slot | undefined;
  day: number;
  period: number;
  classId: string;
  allSlots: Slot[];
  onAddSlot: (slot: Omit<Slot, "id" | "isConflict">) => void;
  onDeleteSlot: (slotId: string) => void;
  readOnly?: boolean;
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
}: CellPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const dayLabel = DAYS.find((d) => d.value === day)?.label || "";

  useEffect(() => {
    if (!open) {
      setSelectedSubjectId("");
      setSelectedTeacherId(null);
    }
  }, [open]);

  const selectedSubject = availableSubjects.find((s) => s.id === selectedSubjectId);
  const teachersForSubject = selectedSubjectId
    ? availableTeachersForSubject[selectedSubjectId] || []
    : [];

  const conflict =
    selectedSubjectId && teachersForSubject.length > 0 && selectedTeacherId
      ? checkConflict(
        { day, period, classId, teacherId: selectedTeacherId },
        allSlots.filter((s) => s.id !== slot?.id)
      )
      : { hasConflict: false };

  const handleSave = () => {
    const subject = availableSubjects.find((s) => s.id === selectedSubjectId);
    if (!subject) return;

    const teacher =
      teachersForSubject.length > 0
        ? teachersForSubject.find((t) => t.id === selectedTeacherId)
        : null;

    onAddSlot({
      day,
      period,
      classId,
      subjectId: subject.id,
      subjectName: subject.name,
      teacherId: teacher?.id || null,
      teacherName: teacher?.name || null,
    });
    setOpen(false);
  };

  // Popover for FILLED cell
  if (slot) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-56 p-4 rounded-xl" align="start">
          <p className="font-semibold text-base font-heading">{slot.subjectName}</p>
          <p className="text-xs text-md-on-surface/50 mb-1">
            {dayLabel} &bull; Tiết {period} &bull; Lớp {classId}
          </p>
          {slot.teacherId ? (
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
              <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs">
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
      <PopoverContent className="w-64 p-4 rounded-xl" align="start">
        <p className="font-semibold text-base font-heading">Xếp tiết</p>
        <p className="text-xs text-md-on-surface/50 mb-3">
          {dayLabel} &bull; Tiết {period} &bull; Lớp {classId}
        </p>

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
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher select - only for BoMon subjects */}
        {teachersForSubject.length > 0 && (
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
                  (s) => s.day === day && s.period === period && s.teacherId === t.id
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
            onClick={() => setOpen(false)}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-br from-md-primary to-md-primary-container text-white rounded-xl"
            disabled={
              !selectedSubjectId ||
              conflict.hasConflict ||
              (teachersForSubject.length > 0 && !selectedTeacherId)
            }
            onClick={handleSave}
          >
            Xếp tiết
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
