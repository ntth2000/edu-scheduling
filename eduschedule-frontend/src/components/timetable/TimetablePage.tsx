"use client";

import { useState, useMemo } from "react";
import {
  type ViewMode,
  type Slot,
  mockSlots,
  CLASSES_BY_GRADE,
  DAYS,
  PERIODS,
} from "@/lib/timetable-data";
import { mockTeachers } from "@/lib/mock-data";
import { TimetableGrid } from "./TimetableGrid";
import { TimetableSidePanel } from "./TimetableSidePanel";
import { GradeView } from "./GradeView";
import { TimetableCell } from "./TimetableCell";
import { CellPopover } from "./CellPopover";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

export function TimetablePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [selectedGrade, setSelectedGrade] = useState(4);
  const [selectedClassId, setSelectedClassId] = useState("4A");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("lien");
  const [slots, setSlots] = useState<Slot[]>(mockSlots);

  const classes = CLASSES_BY_GRADE[selectedGrade] || [];

  // Get unique BM teachers for the teacher selector
  const bmTeachers = useMemo(() => {
    const uniqueIds = new Set<string>();
    const result: { id: string; name: string }[] = [];
    slots.forEach((s) => {
      if (s.teacherId && !uniqueIds.has(s.teacherId)) {
        uniqueIds.add(s.teacherId);
        result.push({ id: s.teacherId, name: s.teacherName! });
      }
    });
    return result;
  }, [slots]);

  const handleAddSlot = (newSlot: Omit<Slot, "id" | "isConflict">) => {
    const id = `slot-${Date.now()}`;
    setSlots((prev) => [...prev, { ...newSlot, id, isConflict: false }]);
    toast.success(`Đã xếp ${newSlot.subjectName} vào TKB`);
  };

  const handleDeleteSlot = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (slot) toast.success(`Đã xóa ${slot.subjectName} khỏi TKB`);
  };

  // Teacher view: show grid for the teacher across all classes
  const teacherSlots = useMemo(
    () => slots.filter((s) => s.teacherId === selectedTeacherId),
    [slots, selectedTeacherId]
  );

  return (
    <div className="p-8 space-y-8 flex-1">
      {/* Page Title + Tabs + Actions */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-extrabold text-md-on-surface tracking-tight font-heading">
            Thời khóa biểu
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Xem và quản lý thời khoá biểu theo lớp, giáo viên hoặc khối.
          </p>
          {/* Tabs */}
          <div className="flex gap-6 mt-4">
            {[
              { value: "class" as ViewMode, label: "Theo lớp" },
              { value: "teacher" as ViewMode, label: "Theo GV" },
              { value: "grade" as ViewMode, label: "Theo khối" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setViewMode(tab.value)}
                className={`text-sm pb-1 transition-colors ${
                  viewMode === tab.value
                    ? "text-blue-700 font-semibold border-b-2 border-blue-600"
                    : "text-slate-500 hover:text-blue-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium">
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <section className="px-4 py-4 bg-md-surface-container-low/30 rounded-xl">
        <div className="flex gap-4 items-center">
          {viewMode === "class" && (
            <>
              <select
                value={selectedGrade}
                onChange={(e) => {
                  const g = Number(e.target.value);
                  setSelectedGrade(g);
                  setSelectedClassId((CLASSES_BY_GRADE[g] || [])[0] || "");
                }}
                className="bg-md-surface-container-lowest border-none rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-md-primary/20 min-w-[140px]"
              >
                {[1, 2, 3, 4, 5].map((g) => (
                  <option key={g} value={g}>
                    Khối {g}
                  </option>
                ))}
              </select>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-md-surface-container-lowest border-none rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-md-primary/20 min-w-[120px]"
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Lớp {c}
                  </option>
                ))}
              </select>
            </>
          )}

          {viewMode === "teacher" && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-md-surface-container-lowest border-none rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-md-primary/20 min-w-[200px]"
            >
              {bmTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {viewMode === "grade" && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="bg-md-surface-container-lowest border-none rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-md-primary/20 min-w-[140px]"
            >
              {[1, 2, 3, 4, 5].map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Main content */}
      <div className="flex-1">
        {viewMode === "class" && (
          <div className="flex gap-8 mt-6">
            <div className="flex-1">
              <TimetableGrid
                classId={selectedClassId}
                slots={slots}
                onAddSlot={handleAddSlot}
                onDeleteSlot={handleDeleteSlot}
              />
            </div>
            <TimetableSidePanel mode="class" classId={selectedClassId} slots={slots} />
          </div>
        )}

        {viewMode === "teacher" && (
          <div className="flex gap-8 mt-6">
            <div className="flex-1">
              <TeacherTimetableGrid
                teacherId={selectedTeacherId}
                slots={slots}
                teacherSlots={teacherSlots}
                onDeleteSlot={handleDeleteSlot}
              />
            </div>
            <TimetableSidePanel mode="teacher" teacherId={selectedTeacherId} slots={slots} />
          </div>
        )}

        {viewMode === "grade" && (
          <div className="mt-6">
            <GradeView
              grade={selectedGrade}
              slots={slots}
              onSelectClass={(classId) => {
                setSelectedClassId(classId);
                setViewMode("class");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Grid showing a teacher's schedule across all classes */
function TeacherTimetableGrid({
  teacherId,
  slots,
  teacherSlots,
  onDeleteSlot,
}: {
  teacherId: string;
  slots: Slot[];
  teacherSlots: Slot[];
  onDeleteSlot: (id: string) => void;
}) {
  const getSlot = (day: number, period: number) =>
    teacherSlots.find((s) => s.day === day && s.period === period);

  return (
    <div className="bg-md-surface-container rounded-2xl overflow-hidden p-0.5">
      <div
        className="grid bg-md-surface-container-high text-md-on-surface-variant font-bold text-[11px] uppercase tracking-wider py-3 text-center"
        style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}
      >
        <div>Tiết</div>
        {DAYS.map((d) => (
          <div key={d.value}>{d.label}</div>
        ))}
      </div>

      <div className="bg-md-surface-container flex flex-col gap-[2px]">
        {PERIODS.map((period) => (
          <div
            key={period}
            className="grid gap-[2px]"
            style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}
          >
            <div className="bg-md-surface-container-lowest flex items-center justify-center font-bold text-slate-500 min-h-[80px]">
              {period}
            </div>
            {DAYS.map((day) => {
              const slot = getSlot(day.value, period);
              if (!slot) {
                return (
                  <div
                    key={`${day.value}-${period}`}
                    className="bg-md-surface-container-lowest min-h-[80px] rounded-sm"
                  />
                );
              }
              return (
                <CellPopover
                  key={`${day.value}-${period}`}
                  slot={slot}
                  day={day.value}
                  period={period}
                  classId={slot.classId}
                  allSlots={slots}
                  onAddSlot={() => {}}
                  onDeleteSlot={onDeleteSlot}
                >
                  <div className="bg-white border-l-[3px] border-md-primary min-h-[80px] p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-sm">
                    <span className="text-xs font-bold text-md-on-surface">
                      {slot.subjectName}
                    </span>
                    <span className="text-[10px] text-md-primary font-medium">
                      Lớp {slot.classId}
                    </span>
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
