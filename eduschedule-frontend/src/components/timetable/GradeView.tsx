"use client";

import { type Slot, DAYS, PERIODS, CLASSES_BY_GRADE } from "@/lib/timetable-data";

interface GradeViewProps {
  grade: number;
  slots: Slot[];
  onSelectClass: (classId: string) => void;
}

export function GradeView({ grade, slots, onSelectClass }: GradeViewProps) {
  const classes = CLASSES_BY_GRADE[grade] || [];

  const getSlot = (classId: string, day: number, period: number) =>
    slots.find((s) => s.classId === classId && s.day === day && s.period === period);

  const getFilledCount = (classId: string) =>
    slots.filter((s) => s.classId === classId).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {classes.map((classId) => (
        <div
          key={classId}
          className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow border border-md-outline-variant/10"
          onClick={() => onSelectClass(classId)}
        >
          <p className="font-semibold text-sm mb-3 font-heading">Lớp {classId}</p>

          {/* Mini grid */}
          <div className="grid grid-cols-5 gap-0.5">
            {PERIODS.map((period) =>
              DAYS.map((day) => {
                const slot = getSlot(classId, day.value, period);
                return (
                  <div
                    key={`${day.value}-${period}`}
                    className={`h-3 rounded-sm ${
                      !slot
                        ? "bg-md-surface-container"
                        : slot.isConflict
                        ? "bg-md-error"
                        : slot.teacherId
                        ? "bg-md-primary"
                        : "bg-md-primary-fixed"
                    }`}
                  />
                );
              })
            )}
          </div>

          <p className="text-xs text-md-on-surface/50 mt-3">
            {getFilledCount(classId)}/35 tiết
          </p>
        </div>
      ))}
    </div>
  );
}
