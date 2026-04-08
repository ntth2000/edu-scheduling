"use client";

import { type Slot } from "@/lib/timetable-data";
import { Plus, AlertTriangle } from "lucide-react";

interface TimetableCellProps {
  slot: Slot | undefined;
  onClick: () => void;
  readOnly?: boolean;
}

export function TimetableCell({ slot, onClick, readOnly = false }: TimetableCellProps) {
  // Empty cell
  if (!slot) {
    if (readOnly) {
      return (
        <div className="bg-md-surface-container min-h-[80px] rounded-sm" />
      );
    }
    return (
      <div
        onClick={onClick}
        className="bg-md-surface-container min-h-[80px] flex items-center justify-center group cursor-pointer hover:bg-md-primary-fixed/20 transition-colors rounded-sm"
      >
        <Plus className="w-5 h-5 text-md-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  // Conflict cell
  if (slot.isConflict) {
    return (
      <div
        onClick={onClick}
        className="bg-md-error-container border-l-[4px] border-md-error min-h-[80px] p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-sm"
      >
        <div className="flex justify-between items-start">
          <span className="text-xs font-bold text-md-on-error-container">{slot.subjectName}</span>
          <AlertTriangle className="w-3 h-3 text-md-error" />
        </div>
        {slot.teacherName && (
          <span className="text-[10px] text-md-error font-medium">{slot.teacherName}</span>
        )}
        <span className="text-[10px] text-md-error/80">Trùng lịch GV</span>
      </div>
    );
  }

  // GVCN slot (teacherId = null)
  if (!slot.teacherId) {
    return (
      <div
        onClick={onClick}
        className="bg-white border-l-[3px] border-md-primary-fixed min-h-[80px] p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-sm"
      >
        <span className="text-xs font-bold text-md-on-surface">{slot.subjectName}</span>
      </div>
    );
  }

  // GV Bộ môn slot
  return (
    <div
      onClick={onClick}
      className="bg-white border-l-[3px] border-md-primary min-h-[80px] p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-sm"
    >
      <span className="text-xs font-bold text-md-on-surface">{slot.subjectName}</span>
      <span className="text-[10px] text-red-600 font-medium">{slot.teacherName}</span>
    </div>
  );
}
