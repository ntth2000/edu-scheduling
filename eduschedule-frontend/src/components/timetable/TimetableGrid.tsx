"use client";

import { useState, useCallback } from "react";
import { type Slot, DAYS, PERIODS, checkConflict } from "@/lib/timetable-data";
import { TimetableCell } from "./TimetableCell";
import { CellPopover } from "./CellPopover";
import { type AssignmentResponse } from "@/lib/api";
import { type Subject, type SchoolClass } from "@/lib/types";
import { useTimetableDrag } from "./TimetableDragContext";
import { toast } from "sonner";

interface TimetableGridProps {
  classId: string;
  slots: Slot[];
  onAddSlot: (params: { assignmentId?: number; classNumericId?: number; subjectNumericId?: number; day: number; period: number; subjectName: string; teacherId: string | null; teacherName: string | null; subjectId: string; classId: string }) => void;
  onDeleteSlot: (slotId: string) => void;
  readOnly?: boolean;
  subjects: Subject[];
  assignments: AssignmentResponse[];
  currentClass?: SchoolClass;
}

export function TimetableGrid({
  classId,
  slots,
  onAddSlot,
  onDeleteSlot,
  readOnly = false,
  subjects,
  assignments,
  currentClass,
}: TimetableGridProps) {
  const { isDragging } = useTimetableDrag();
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const classSlots = slots.filter((s) => s.classId === classId);

  const getSlot = (day: number, period: number) =>
    classSlots.find((s) => s.day === day && s.period === period);

  const handleDragOver = useCallback(
    (e: React.DragEvent, day: number, period: number, hasSlot: boolean) => {
      if (readOnly || hasSlot) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOverCell(`${day}-${period}`);
    },
    [readOnly]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if actually leaving the cell (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCell(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, day: number, period: number) => {
      e.preventDefault();
      setDragOverCell(null);

      const raw = e.dataTransfer.getData("application/timetable-subject");
      if (!raw) return;

      try {
        const data = JSON.parse(raw);
        const teacherId: string | null = data.assignmentId
          ? data.teacherId
          : (data.homeroomTeacherId ?? null);

        // Check teacher conflict before scheduling
        if (teacherId) {
          const conflict = checkConflict(
            { day, period, classId, teacherId },
            slots
          );
          if (conflict.hasConflict) {
            toast.error(conflict.reason);
            return;
          }
        }

        if (data.assignmentId) {
          // BM teacher path
          onAddSlot({
            assignmentId: data.assignmentId,
            day,
            period,
            classId,
            subjectId: data.subjectId,
            subjectName: data.subjectName,
            teacherId: data.teacherId,
            teacherName: data.teacherName,
          });
        } else {
          // GVCN path
          onAddSlot({
            classNumericId: data.classNumericId,
            subjectNumericId: data.subjectNumericId,
            day,
            period,
            classId,
            subjectId: data.subjectId,
            subjectName: data.subjectName,
            teacherId: data.homeroomTeacherId ?? null,
            teacherName: data.homeroomTeacherName ?? null,
          });
        }
      } catch {
        // invalid drag data
      }
    },
    [classId, slots, onAddSlot]
  );

  return (
    <div className="bg-md-surface-container rounded-2xl overflow-hidden p-0.5">
      {/* Grid Header */}
      <div
        className="grid bg-md-surface-container-high text-md-on-surface-variant font-bold text-[11px] uppercase tracking-wider py-3 text-center"
        style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}
      >
        <div>Tiết</div>
        {DAYS.map((d) => (
          <div key={d.value}>{d.label}</div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="bg-md-surface-container flex flex-col gap-[2px]">
        {PERIODS.map((period) => (
          <div
            key={period}
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}
          >
            {/* Period label */}
            <div className="bg-md-surface-container-lowest flex items-center justify-center font-bold text-slate-500 min-h-[60px]">
              {period}
            </div>

            {/* Day cells */}
            {DAYS.map((day) => {
              const slot = getSlot(day.value, period);
              const cellKey = `${day.value}-${period}`;
              const isDropTarget = isDragging && !slot && !readOnly;
              const isHovered = dragOverCell === cellKey;

              return (
                <div
                  key={cellKey}
                  onDragOver={(e) => handleDragOver(e, day.value, period, !!slot)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    if (!slot && !readOnly) handleDrop(e, day.value, period);
                  }}
                  className={`relative transition-all duration-150 rounded-sm ${
                    isHovered
                      ? "ring-2 ring-md-primary bg-md-primary-fixed/30 scale-[1.02]"
                      : isDropTarget
                        ? "ring-1 ring-dashed ring-md-primary/30 bg-md-primary-fixed/5"
                        : ""
                  }`}
                >
                  <CellPopover
                    slot={slot}
                    day={day.value}
                    period={period}
                    classId={classId}
                    allSlots={slots}
                    onAddSlot={onAddSlot}
                    onDeleteSlot={onDeleteSlot}
                    readOnly={readOnly}
                    subjects={subjects}
                    assignments={assignments}
                    currentClass={currentClass}
                  >
                    <div>
                      <TimetableCell slot={slot} onClick={() => {}} readOnly={readOnly} />
                    </div>
                  </CellPopover>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
