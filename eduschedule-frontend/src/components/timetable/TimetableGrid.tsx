"use client";

import { type Slot, DAYS, PERIODS } from "@/lib/timetable-data";
import { TimetableCell } from "./TimetableCell";
import { CellPopover } from "./CellPopover";

interface TimetableGridProps {
  classId: string;
  slots: Slot[];
  onAddSlot: (slot: Omit<Slot, "id" | "isConflict">) => void;
  onDeleteSlot: (slotId: string) => void;
}

export function TimetableGrid({ classId, slots, onAddSlot, onDeleteSlot }: TimetableGridProps) {
  const classSlots = slots.filter((s) => s.classId === classId);

  const getSlot = (day: number, period: number) =>
    classSlots.find((s) => s.day === day && s.period === period);

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
            <div className="bg-md-surface-container-lowest flex items-center justify-center font-bold text-slate-500 min-h-[80px]">
              {period}
            </div>

            {/* Day cells */}
            {DAYS.map((day) => {
              const slot = getSlot(day.value, period);
              return (
                <CellPopover
                  key={`${day.value}-${period}`}
                  slot={slot}
                  day={day.value}
                  period={period}
                  classId={classId}
                  allSlots={slots}
                  onAddSlot={onAddSlot}
                  onDeleteSlot={onDeleteSlot}
                >
                  <div>
                    <TimetableCell slot={slot} onClick={() => {}} />
                  </div>
                </CellPopover>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
