"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  type ViewMode,
  type Slot,
  DAYS,
  PERIODS,
  mapSlot,
} from "@/lib/timetable-data";
import { TimetableGrid } from "./TimetableGrid";
import { TimetableSidePanel } from "./TimetableSidePanel";
import { GradeView } from "./GradeView";
import { CellPopover } from "./CellPopover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Subject } from "@/lib/types";
import {
  exportClassTimetable,
  exportTeacherTimetable,
  exportGradeTimetable,
} from "@/lib/export-timetable";
import {
  assignmentApi,
  AssignmentResponse,
  classApi,
  ClassResponse,
  slotApi,
  subjectApi,
  TeacherResponse,
  teacherApi,
  timetableApi,
  TimetableResponse,
} from "@/lib/api";
import { TimetableDragProvider } from "./TimetableDragContext";

export function TimetablePage({ readOnly = false }: { readOnly?: boolean }) {
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [selectedGrade, setSelectedGrade] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentTimetable, setCurrentTimetable] = useState<TimetableResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingLabel, setExportingLabel] = useState<string | null>(null);

  // Load master data
  useEffect(() => {
    Promise.all([teacherApi.getAll(), subjectApi.getAll(), classApi.getAll(), assignmentApi.getAll()])
      .then(([t, s, c, a]) => {
        setTeachers(t);
        setSubjects(s.map((sub) => ({
          ...sub,
          periodsByGrade: [sub.periodsGrade1, sub.periodsGrade2, sub.periodsGrade3, sub.periodsGrade4, sub.periodsGrade5],
        })));
        const sortedClasses = [...c].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, "vi"));
        setClasses(sortedClasses);
        setAssignments(a);

        // Set initial selections from real data
        const firstClass = sortedClasses[0];
        if (firstClass) {
          setSelectedGrade(firstClass.grade);
          setSelectedClassId(firstClass.name);
        }
        const firstBmTeacher = t.find((x) => x.type === "BO_MON" || x.type === "KHAC");
        if (firstBmTeacher) setSelectedTeacherId(firstBmTeacher.id.toString());
      })
      .catch(() => toast.error("Không thể tải dữ liệu"));
  }, []);

  // Load timetable then slots
  useEffect(() => {
    timetableApi.getAll()
      .then(async (list) => {
        let timetable = list[0] ?? null; // most recent first
        if (!timetable) {
          timetable = await timetableApi.create();
          toast.info("Đã tạo thời khoá biểu mới");
        }
        setCurrentTimetable(timetable);
        const rawSlots = await slotApi.getByTimetable(timetable.id);
        setSlots(rawSlots.map(mapSlot));
      })
      .catch(() => toast.error("Không thể tải thời khoá biểu"))
      .finally(() => setLoading(false));
  }, []);

  // BM teachers for "Theo GV" view
  const bmTeachers = useMemo(
    () => teachers.filter((t) => t.type === "BO_MON" || t.type === "KHAC"),
    [teachers]
  );

  const handleAddSlot = useCallback(
    async (params: AddSlotParams) => {
      if (readOnly || !currentTimetable) return;
      try {
        const saved = await slotApi.save({
          timetableId: currentTimetable.id,
          day: params.day,
          period: params.period,
          ...(params.assignmentId
            ? { assignmentId: params.assignmentId }
            : { classId: params.classNumericId, subjectId: params.subjectNumericId }),
        });
        setSlots((prev) => {
          // Replace existing slot at same position if any (upsert)
          const filtered = prev.filter((s) => !(s.classId === params.classId && s.day === params.day && s.period === params.period));
          return [...filtered, mapSlot(saved)];
        });
        toast.success(`Đã xếp ${params.subjectName} vào TKB`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Không thể xếp tiết");
      }
    },
    [readOnly, currentTimetable]
  );

  const handleExportExcel = useCallback(() => {
    let label = "";
    if (viewMode === "class") {
      label = `Thời khoá biểu lớp ${selectedClassId}`;
    } else if (viewMode === "teacher") {
      const teacher = teachers.find((t) => t.id.toString() === selectedTeacherId);
      label = `Thời khoá biểu giáo viên ${teacher?.fullName ?? selectedTeacherId}`;
    } else {
      label = `Thời khoá biểu khối ${selectedGrade}`;
    }
    setExportingLabel(label);

    // Small delay so the modal renders before the synchronous xlsx work blocks the thread
    setTimeout(() => {
      try {
        if (viewMode === "class") {
          const cls = classes.find((c) => c.name === selectedClassId);
          exportClassTimetable(slots, selectedClassId, cls?.homeroomTeacherName);
        } else if (viewMode === "teacher") {
          const teacher = teachers.find((t) => t.id.toString() === selectedTeacherId);
          exportTeacherTimetable(slots, selectedTeacherId, teacher?.fullName ?? selectedTeacherId);
        } else {
          exportGradeTimetable(slots, selectedGrade, classes);
        }
        toast.success(`Đã xuất ${label}`);
      } catch {
        toast.error("Xuất file thất bại");
      } finally {
        setExportingLabel(null);
      }
    }, 80);
  }, [viewMode, selectedClassId, selectedTeacherId, selectedGrade, slots, teachers, classes]);

  const handleDeleteSlot = useCallback(
    async (slotId: string) => {
      if (readOnly) return;
      const slot = slots.find((s) => s.id === slotId);
      const apiId = slot?.apiId ?? parseInt(slotId);
      if (!apiId || isNaN(apiId)) return;
      try {
        await slotApi.delete(apiId);
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
        if (slot) toast.success(`Đã xóa ${slot.subjectName} khỏi TKB`);
      } catch {
        toast.error("Không thể xóa tiết");
      }
    },
    [readOnly, slots]
  );

  const teacherSlots = useMemo(
    () => slots.filter((s) => s.teacherId === selectedTeacherId),
    [slots, selectedTeacherId]
  );

  const currentClass = useMemo(
    () => classes.find((c) => c.name === selectedClassId),
    [classes, selectedClassId]
  );

  const currentSubjectsMapped = useMemo(
    () => subjects.filter((s) => s.periodsByGrade[selectedGrade - 1] > 0),
    [subjects, selectedGrade]
  );

  const classAssignments = useMemo(
    () => assignments.filter((a) => a.className === selectedClassId),
    [assignments, selectedClassId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Đang tải thời khoá biểu...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 flex-1">
      {/* Page Title + Tabs + Actions */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-extrabold text-md-on-surface tracking-tight font-heading">
            Thời khóa biểu
          </h2>
          {!readOnly && (
            <p className="text-slate-500 text-sm mt-1">
              Xem và quản lý thời khoá biểu theo lớp, giáo viên hoặc khối.
              {currentTimetable && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  currentTimetable.status === "PUBLISHED"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {currentTimetable.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
                </span>
              )}
            </p>
          )}
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
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
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
                  const firstInGrade = classes.find((c) => c.grade === g);
                  if (firstInGrade) setSelectedClassId(firstInGrade.name);
                }}
                className="bg-md-surface-container-lowest border-none rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-md-primary/20 min-w-[140px]"
              >
                {[...new Set(classes.map((c) => c.grade))].map((g) => (
                  <option key={g} value={g}>Khối {g}</option>
                ))}
              </select>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-md-surface-container-lowest border-none rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-md-primary/20 min-w-[120px]"
              >
                {classes.filter((c) => c.grade === selectedGrade).map((c) => (
                  <option key={c.id} value={c.name}>Lớp {c.name}</option>
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
                <option key={t.id} value={t.id.toString()}>{t.fullName}</option>
              ))}
            </select>
          )}

          {viewMode === "grade" && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="bg-md-surface-container-lowest border-none rounded-xl px-4 py-2.5 text-sm shadow-sm focus:ring-2 focus:ring-md-primary/20 min-w-[140px]"
            >
              {[...new Set(classes.map((c) => c.grade))].map((g) => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Export loading modal */}
      {exportingLabel && (
        <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 w-full max-w-sm mx-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-slate-800">Đang xuất file...</p>
              <p className="text-sm text-slate-500 mt-1">{exportingLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1">
        {viewMode === "class" && (
          <TimetableDragProvider>
            <div className="flex gap-8 mt-6">
              <div className="flex-1">
                <TimetableGrid
                  classId={selectedClassId}
                  slots={slots}
                  onAddSlot={handleAddSlot}
                  onDeleteSlot={handleDeleteSlot}
                  readOnly={readOnly}
                  subjects={currentSubjectsMapped}
                  assignments={classAssignments}
                  currentClass={currentClass ? { id: currentClass.id, code: "", grade: currentClass.grade, name: currentClass.name, studentCount: 0, homeroomTeacher: currentClass.homeroomTeacherName ?? null, homeroomTeacherId: currentClass.homeroomTeacherId ?? null, assignmentStatus: currentClass.homeroomTeacherId ? "complete" : "incomplete" } : undefined}
                />
              </div>
              {!readOnly && (
                <TimetableSidePanel
                  mode="class"
                  classId={selectedClassId}
                  slots={slots}
                  subjects={currentSubjectsMapped}
                  assignments={classAssignments}
                  currentClass={currentClass ? { id: currentClass.id, code: "", grade: currentClass.grade, name: currentClass.name, studentCount: 0, homeroomTeacher: currentClass.homeroomTeacherName ?? null, homeroomTeacherId: currentClass.homeroomTeacherId ?? null, assignmentStatus: currentClass.homeroomTeacherId ? "complete" : "incomplete" } : undefined}
                />
              )}
            </div>
          </TimetableDragProvider>
        )}

        {viewMode === "teacher" && (
          <div className="flex gap-8 mt-6">
            <div className="flex-1">
              <TeacherTimetableGrid
                teacherId={selectedTeacherId}
                slots={slots}
                teacherSlots={teacherSlots}
                onAddSlot={handleAddSlot}
                onDeleteSlot={handleDeleteSlot}
                readOnly={readOnly}
                subjects={subjects}
                assignments={assignments.filter((a) => a.teacherId.toString() === selectedTeacherId)}
              />
            </div>
            {!readOnly && (
              <TimetableSidePanel
                mode="teacher"
                teacherId={selectedTeacherId}
                slots={slots}
                subjects={subjects}
                assignments={assignments}
                teachers={teachers}
              />
            )}
          </div>
        )}

        {viewMode === "grade" && (
          <div className="mt-6">
            <GradeView
              grade={selectedGrade}
              slots={slots}
              classes={classes}
              subjects={subjects}
              assignments={assignments}
              readOnly={readOnly}
              onAddSlot={handleAddSlot}
              onDeleteSlot={handleDeleteSlot}
              onSelectClass={(className) => {
                setSelectedClassId(className);
                setViewMode("class");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

type AddSlotParams = { assignmentId?: number; classNumericId?: number; subjectNumericId?: number; day: number; period: number; subjectName: string; teacherId: string | null; teacherName: string | null; subjectId: string; classId: string };

/** Grid showing a teacher's schedule across all classes */
function TeacherTimetableGrid({
  slots,
  teacherSlots,
  onAddSlot,
  onDeleteSlot,
  readOnly = false,
  subjects,
  assignments,
}: {
  teacherId: string;
  slots: Slot[];
  teacherSlots: Slot[];
  onAddSlot: (params: AddSlotParams) => void;
  onDeleteSlot: (id: string) => void;
  readOnly?: boolean;
  subjects: Subject[];
  assignments: AssignmentResponse[];
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
              if (slot) {
                return (
                  <CellPopover
                    key={`${day.value}-${period}`}
                    slot={slot}
                    day={day.value}
                    period={period}
                    classId={slot.classId}
                    allSlots={slots}
                    onAddSlot={onAddSlot}
                    onDeleteSlot={onDeleteSlot}
                    readOnly={readOnly}
                    subjects={subjects}
                    assignments={assignments}
                  >
                    <div className="bg-white border-l-[3px] border-md-primary min-h-[80px] p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-sm">
                      <span className="text-xs font-bold text-md-on-surface">{slot.subjectName}</span>
                      <span className="text-[10px] text-md-primary font-medium">Lớp {slot.classId}</span>
                    </div>
                  </CellPopover>
                );
              }
              return (
                <TeacherEmptyCellPopover
                  key={`${day.value}-${period}`}
                  day={day.value}
                  period={period}
                  allSlots={slots}
                  teacherAssignments={assignments}
                  onAddSlot={onAddSlot}
                  readOnly={readOnly}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Popover for empty cells in the teacher view — lets user pick which class to schedule */
function TeacherEmptyCellPopover({
  day,
  period,
  allSlots,
  teacherAssignments,
  onAddSlot,
  readOnly,
}: {
  day: number;
  period: number;
  allSlots: Slot[];
  teacherAssignments: AssignmentResponse[];
  onAddSlot: (params: AddSlotParams) => void;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | "">("");

  const dayLabel = DAYS.find((d) => d.value === day)?.label ?? "";

  // Classes that already have a slot at this day+period
  const busyClasses = new Set(
    allSlots.filter((s) => s.day === day && s.period === period).map((s) => s.classId)
  );

  const selected = teacherAssignments.find((a) => a.id === selectedId);

  const handleSave = () => {
    if (!selected) return;
    onAddSlot({
      assignmentId: selected.id,
      day,
      period,
      classId: selected.className,
      subjectId: selected.subjectId.toString(),
      subjectName: selected.subjectName,
      teacherId: selected.teacherId.toString(),
      teacherName: selected.teacherName,
    });
    setOpen(false);
    setSelectedId("");
  };

  if (readOnly) {
    return <div className="bg-md-surface-container-lowest min-h-[80px] rounded-sm" />;
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelectedId(""); }}>
      <PopoverTrigger asChild>
        <div className="bg-md-surface-container-lowest min-h-[80px] rounded-sm cursor-pointer hover:bg-md-surface-container transition-colors" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 rounded-xl" align="start">
        <p className="font-semibold text-base font-heading mb-1">Xếp tiết</p>
        <p className="text-xs text-md-on-surface/50 mb-3">
          {dayLabel} &bull; Tiết {period}
        </p>

        <label className="text-[11px] uppercase tracking-[0.05em] font-medium text-md-on-surface/60 block mb-1">
          Lớp / Môn *
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-md-primary bg-slate-50 mb-4"
        >
          <option value="">-- Chọn lớp --</option>
          {teacherAssignments.map((a) => {
            const busy = busyClasses.has(a.className);
            return (
              <option key={a.id} value={a.id} disabled={busy}>
                Lớp {a.className} – {a.subjectName}{busy ? " (Lớp đang bận)" : ""}
              </option>
            );
          })}
        </select>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gradient-to-br from-md-primary to-md-primary-container text-white rounded-xl"
            disabled={!selectedId || (selected ? busyClasses.has(selected.className) : false)}
            onClick={handleSave}
          >
            Xếp tiết
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
