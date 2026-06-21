"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  type Slot,
  DAYS,
  PERIODS,
  SESSIONS,
  mapSlot,
  computeConflicts,
} from "@/lib/timetable-data";
import { TimetableGrid } from "./TimetableGrid";
import { GradeView } from "./GradeView";
import { CellPopover } from "./CellPopover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileSpreadsheet, AlertTriangle, Users, ArrowLeft, BarChart2,
  Check, ChevronDown, Save, X, Pencil,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
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
  specialRoomApi,
  SpecialRoomResponse,
  subjectApi,
  TeacherResponse,
  teacherApi,
  timetableApi,
  TimetableResponse,
  weekApi,
  WeekResponse,
} from "@/lib/api";
import { TimetableDragProvider } from "./TimetableDragContext";

type AddSlotParams = {
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
};

type PendingSlotAdd = {
  params: AddSlotParams;
  conflictingSlot: Slot;
};

export function TimetablePage({
  timetableId,
  yearParam,
}: {
  timetableId?: number;
  yearParam?: string | null;
}) {
  const router = useRouter();

  // ── Main view state ───────────────────────────────────
  const [selectedGrade, setSelectedGrade] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [inTeacherView, setInTeacherView] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [progressClassId, setProgressClassId] = useState<string>("");
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [activeProgressTab, setActiveProgressTab] = useState<"progress" | "workload">("progress");
  const [progressGrade, setProgressGrade] = useState(1);
  const [highlightedSlotIds, setHighlightedSlotIds] = useState<Set<string>>(new Set());

  // ── Edit overlay state ────────────────────────────────
  const [isEditOverlayOpen, setIsEditOverlayOpen] = useState(false);
  const [overlayGrade, setOverlayGrade] = useState(1);
  const [overlayClassId, setOverlayClassId] = useState<string>("all");
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(false);
  const [applyForwardConfirmOpen, setApplyForwardConfirmOpen] = useState(false);

  // ── Data state ────────────────────────────────────────
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [specialRooms, setSpecialRooms] = useState<SpecialRoomResponse[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [currentTimetable, setCurrentTimetable] = useState<TimetableResponse | null>(null);
  const [weeks, setWeeks] = useState<WeekResponse[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [pendingAdds, setPendingAdds] = useState<Map<string, AddSlotParams>>(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [weekSwitchTarget, setWeekSwitchTarget] = useState<number | null>(null);
  const [navTarget, setNavTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingLabel, setExportingLabel] = useState<string | null>(null);
  const [pendingAdd, setPendingAdd] = useState<PendingSlotAdd | null>(null);

  const hasDirtyChanges = pendingAdds.size > 0 || pendingDeletes.size > 0;

  // ── Unsaved changes guards ────────────────────────────
  useEffect(() => {
    if (!hasDirtyChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasDirtyChanges]);

  useEffect(() => {
    if (!hasDirtyChanges) return;
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      setNavTarget("__pop__");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasDirtyChanges]);

  // ── Data loading ──────────────────────────────────────
  useEffect(() => {
    Promise.all([teacherApi.getAll(), subjectApi.getAll(), classApi.getAll(), assignmentApi.getAll(), specialRoomApi.getAll()])
      .then(([t, s, c, a, r]) => {
        setTeachers(t);
        setSubjects(
          s.map((sub) => ({
            ...sub,
            periodsByGrade: [sub.periodsGrade1, sub.periodsGrade2, sub.periodsGrade3, sub.periodsGrade4, sub.periodsGrade5],
          }))
        );
        const sorted = [...c].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, "vi"));
        setClasses(sorted);
        setAssignments(a);
        setSpecialRooms(r);
        const firstClass = sorted[0];
        if (firstClass) { setSelectedGrade(firstClass.grade); setProgressClassId(firstClass.name); }
        const firstBm = t.find((x) => x.type === "BO_MON" || x.type === "KHAC");
        if (firstBm) setSelectedTeacherId(firstBm.id.toString());
      })
      .catch(() => toast.error("Không thể tải dữ liệu"));
  }, []);

  useEffect(() => {
    const load = timetableId
      ? timetableApi.getById(timetableId)
      : timetableApi.getAll().then((list) => list[0] ?? null);
    load
      .then(async (timetable) => {
        if (!timetable) return;
        setCurrentTimetable(timetable);
        const w = await weekApi.getByTimetable(timetable.id);
        setWeeks(w);
        if (w.length > 0) setSelectedWeekId(w[0].id);
      })
      .catch(() => toast.error("Không thể tải thời khoá biểu"))
      .finally(() => setLoading(false));
  }, [timetableId]);

  useEffect(() => {
    if (!selectedWeekId) { setSlots([]); return; }
    slotApi.getByWeek(selectedWeekId)
      .then((rawSlots) => setSlots(rawSlots.map(mapSlot)))
      .catch(() => toast.error("Không thể tải tiết học"));
  }, [selectedWeekId]);

  // ── Derived ───────────────────────────────────────────
  const slotsWithConflicts = useMemo(() => computeConflicts(slots), [slots]);
  const savedSlotsWithConflicts = useMemo(() => slotsWithConflicts.filter((s) => !s.isDirty), [slotsWithConflicts]);
  const grades = useMemo(() => [...new Set(classes.map((c) => c.grade))].sort(), [classes]);

  const gradeClasses = useMemo(
    () => classes.filter((c) => c.grade === selectedGrade).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [classes, selectedGrade]
  );
  const gradeSubjects = useMemo(
    () => subjects.filter((s) => s.periodsByGrade[selectedGrade - 1] > 0),
    [subjects, selectedGrade]
  );
  const currentClassObj = useMemo(() => classes.find((c) => c.name === selectedClassId), [classes, selectedClassId]);
  const classAssignments = useMemo(() => assignments.filter((a) => a.className === selectedClassId), [assignments, selectedClassId]);

  const overlayGradeClasses = useMemo(
    () => classes.filter((c) => c.grade === overlayGrade).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [classes, overlayGrade]
  );
  const overlayGradeSubjects = useMemo(
    () => subjects.filter((s) => s.periodsByGrade[overlayGrade - 1] > 0),
    [subjects, overlayGrade]
  );
  const overlayClassObj = useMemo(() => classes.find((c) => c.name === overlayClassId), [classes, overlayClassId]);
  const overlayClassAssignments = useMemo(() => assignments.filter((a) => a.className === overlayClassId), [assignments, overlayClassId]);

  const bmTeachers = useMemo(() => teachers.filter((t) => t.type === "BO_MON" || t.type === "KHAC"), [teachers]);
  const teacherSlots = useMemo(() => savedSlotsWithConflicts.filter((s) => s.teacherId === selectedTeacherId), [savedSlotsWithConflicts, selectedTeacherId]);
  const selectedWeek = useMemo(() => weeks.find((w) => w.id === selectedWeekId) ?? null, [weeks, selectedWeekId]);

  const conflictGroups = useMemo(() => {
    const map = new Map<string, Slot[]>();
    slotsWithConflicts.filter((s) => s.isConflict).forEach((s) => {
      const key = `${s.day}-${s.period}-${s.teacherId}`;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    });
    return [...map.entries()].map(([key, group]) => ({
      key, teacherName: group[0].teacherName ?? "GV",
      day: group[0].day, period: group[0].period,
      slotIds: group.map((s) => s.id), classNames: group.map((s) => s.classId),
    }));
  }, [slotsWithConflicts]);

  const roomConflictGroups = useMemo(() => {
    if (specialRooms.length === 0) return [];
    const subjectToRoom = new Map<string, SpecialRoomResponse>();
    for (const room of specialRooms) { if (room.subjectId != null) subjectToRoom.set(room.subjectId.toString(), room); }
    const grouped = new Map<string, { room: SpecialRoomResponse; slots: Slot[] }>();
    for (const slot of slotsWithConflicts) {
      const room = subjectToRoom.get(slot.subjectId);
      if (!room) continue;
      const key = `${slot.day}-${slot.period}-${room.id}`;
      const entry = grouped.get(key) ?? { room, slots: [] };
      entry.slots.push(slot);
      grouped.set(key, entry);
    }
    return [...grouped.values()]
      .filter(({ room, slots }) => slots.length > room.quantity)
      .map(({ room, slots }) => ({
        key: `room-${slots[0].day}-${slots[0].period}-${room.id}`,
        roomName: room.name, day: slots[0].day, period: slots[0].period,
        classNames: slots.map((s) => s.classId),
      }));
  }, [slotsWithConflicts, specialRooms]);

  const gapWarnings = useMemo(() => {
    const result: { key: string; className: string; day: number; period: number }[] = [];
    const classNames = [...new Set(slotsWithConflicts.map((s) => s.classId))];
    for (const className of classNames) {
      const classSlots = slotsWithConflicts.filter((s) => s.classId === className);
      for (const dayObj of DAYS) {
        const daySlots = classSlots.filter((s) => s.day === dayObj.value);
        for (const session of SESSIONS) {
          const sessionPeriods = [...session.periods] as number[];
          const occupied = sessionPeriods.filter((p) => daySlots.some((s) => s.period === p));
          if (occupied.length < 2) continue;
          const minP = Math.min(...occupied);
          const maxP = Math.max(...occupied);
          for (let p = minP + 1; p < maxP; p++) {
            if (!occupied.includes(p))
              result.push({ key: `gap-${className}-${dayObj.value}-${p}`, className, day: dayObj.value, period: p });
          }
        }
      }
    }
    return result;
  }, [slotsWithConflicts]);

  const allIssues = useMemo(() => {
    const label = (day: number, period: number) => {
      const d = DAYS.find((x) => x.value === day)?.label ?? "";
      const session = SESSIONS.find((s) => (s.periods as readonly number[]).includes(period));
      const p = session ? `${session.label} T${period - session.periods[0] + 1}` : `Tiết ${period}`;
      return { d, p };
    };
    const errors = [
      ...conflictGroups.map((cg) => {
        const { d, p } = label(cg.day, cg.period);
        return { key: cg.key, label: `GV ${cg.teacherName} trùng lịch — ${d}, ${p} (${cg.classNames.join(", ")})`, severity: "error" as const };
      }),
      ...roomConflictGroups.map((rg) => {
        const { d, p } = label(rg.day, rg.period);
        return { key: rg.key, label: `Phòng ${rg.roomName} trùng — ${d}, ${p} (${rg.classNames.join(", ")})`, severity: "error" as const };
      }),
    ];
    const warnings = gapWarnings.map((gw) => {
      const { d, p } = label(gw.day, gw.period);
      return { key: gw.key, label: `Tiết trống giữa buổi — ${gw.className}, ${d} ${p}`, severity: "warning" as const };
    });
    return [...errors, ...warnings];
  }, [conflictGroups, roomConflictGroups, gapWarnings]);

  const progressGradeClasses = useMemo(
    () => classes.filter((c) => c.grade === progressGrade).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [classes, progressGrade]
  );
  const progressGradeSubjects = useMemo(
    () => subjects.filter((s) => s.periodsByGrade[progressGrade - 1] > 0),
    [subjects, progressGrade]
  );

  // ── Handlers ──────────────────────────────────────────
  const handleGradeSelect = (grade: number) => {
    setSelectedGrade(grade);
    setSelectedClassId("all");
    const firstInGrade = classes.find((c) => c.grade === grade);
    if (firstInGrade) setProgressClassId(firstInGrade.name);
  };

  const handleProgressGradeChange = (g: number) => {
    setProgressGrade(g);
    const first = classes.find((c) => c.grade === g);
    if (first) setProgressClassId(first.name);
  };

  const markDirtyAdd = useCallback(
    (params: AddSlotParams) => {
      const cellKey = `${params.day}-${params.period}-${params.classId}`;
      const existingSlot = slots.find(
        (s) => s.day === params.day && s.period === params.period && s.classId === params.classId
      );
      if (existingSlot && !existingSlot.isDirty && existingSlot.apiId) {
        setPendingDeletes((prev) => new Set([...prev, existingSlot.apiId!]));
      }
      setPendingAdds((prev) => new Map(prev).set(cellKey, params));
      setSlots((prev) => [
        ...prev.filter((s) => !(s.classId === params.classId && s.day === params.day && s.period === params.period)),
        {
          id: `dirty-${cellKey}`, assignmentId: params.assignmentId,
          day: params.day, period: params.period, classId: params.classId,
          subjectId: params.subjectId, subjectName: params.subjectName,
          teacherId: params.teacherId, teacherName: params.teacherName,
          isConflict: false, isDirty: true,
        },
      ]);
      toast.success(`Đã xếp ${params.subjectName}`, { duration: 1500 });
    },
    [slots]
  );

  const handleAddSlot = useCallback(
    (params: AddSlotParams) => {
      if (!selectedWeekId) return;
      if (params.assignmentId && params.teacherId) {
        const conflictingSlot = slots.find(
          (s) => s.day === params.day && s.period === params.period && s.teacherId === params.teacherId && s.classId !== params.classId
        );
        if (conflictingSlot) { setPendingAdd({ params, conflictingSlot }); return; }
      }
      markDirtyAdd(params);
    },
    [selectedWeekId, slots, markDirtyAdd]
  );

  const handleConfirmAdd = useCallback(() => {
    if (!pendingAdd) return;
    const { params, conflictingSlot } = pendingAdd;
    setPendingAdd(null);
    if (conflictingSlot.isDirty) {
      const conflictKey = `${conflictingSlot.day}-${conflictingSlot.period}-${conflictingSlot.classId}`;
      setPendingAdds((prev) => { const next = new Map(prev); next.delete(conflictKey); return next; });
    } else if (conflictingSlot.apiId) {
      setPendingDeletes((prev) => new Set([...prev, conflictingSlot.apiId!]));
    }
    setSlots((prev) => prev.filter((s) => s.id !== conflictingSlot.id));
    markDirtyAdd(params);
  }, [pendingAdd, markDirtyAdd]);

  const handleDeleteSlot = useCallback(
    (slotId: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return;
      const cellKey = `${slot.day}-${slot.period}-${slot.classId}`;
      if (slot.isDirty) {
        setPendingAdds((prev) => { const next = new Map(prev); next.delete(cellKey); return next; });
      } else if (slot.apiId) {
        setPendingDeletes((prev) => new Set([...prev, slot.apiId!]));
      }
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast.success(`Đã xóa ${slot.subjectName}`, { duration: 1500 });
    },
    [slots]
  );

  const handleSave = useCallback(async () => {
    if (!selectedWeekId || saving || !hasDirtyChanges) return;
    const adds = pendingAdds;
    const deletes = pendingDeletes;
    const totalOps = adds.size + deletes.size;
    setSaving(true);
    try {
      if (deletes.size > 0) await Promise.all([...deletes].map((apiId) => slotApi.delete(apiId)));
      if (adds.size > 0) {
        await Promise.all(
          [...adds.values()].map((params) =>
            slotApi.save({
              weekId: selectedWeekId,
              assignmentId: params.assignmentId,
              classId: params.classNumericId,
              subjectId: params.subjectNumericId,
              day: params.day,
              session: params.period <= 4 ? 1 : 2,
              period: params.period,
            })
          )
        );
      }
      const rawSlots = await slotApi.getByWeek(selectedWeekId);
      setSlots(rawSlots.map(mapSlot));
      setPendingAdds(new Map());
      setPendingDeletes(new Set());
      toast.success(`Đã lưu ${totalOps} thay đổi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  }, [selectedWeekId, saving, hasDirtyChanges, pendingAdds, pendingDeletes]);

  const handleApplyForward = useCallback(async () => {
    if (!selectedWeekId || saving) return;
    setApplyForwardConfirmOpen(false);
    const adds = pendingAdds;
    const deletes = pendingDeletes;
    setSaving(true);
    try {
      if (deletes.size > 0) await Promise.all([...deletes].map((id) => slotApi.delete(id)));
      if (adds.size > 0) {
        await Promise.all(
          [...adds.values()].map((params) =>
            slotApi.save({
              weekId: selectedWeekId,
              assignmentId: params.assignmentId,
              classId: params.classNumericId,
              subjectId: params.subjectNumericId,
              day: params.day,
              session: params.period <= 4 ? 1 : 2,
              period: params.period,
            })
          )
        );
      }
      await weekApi.applyForward(selectedWeekId);
      const rawSlots = await slotApi.getByWeek(selectedWeekId);
      setSlots(rawSlots.map(mapSlot));
      setPendingAdds(new Map());
      setPendingDeletes(new Set());
      toast.success(`Đã áp dụng TKB từ tuần ${selectedWeek?.weekNumber ?? ""} trở đi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể áp dụng");
    } finally {
      setSaving(false);
    }
  }, [selectedWeekId, saving, pendingAdds, pendingDeletes, selectedWeek]);

  const handleWeekSelect = useCallback(
    (weekId: number) => {
      if (weekId === selectedWeekId) return;
      if (hasDirtyChanges) setWeekSwitchTarget(weekId);
      else setSelectedWeekId(weekId);
    },
    [selectedWeekId, hasDirtyChanges]
  );

  const confirmWeekSwitch = useCallback(() => {
    if (!weekSwitchTarget) return;
    setPendingAdds(new Map());
    setPendingDeletes(new Set());
    setSelectedWeekId(weekSwitchTarget);
    setWeekSwitchTarget(null);
  }, [weekSwitchTarget]);

  const handleOpenOverlay = useCallback(() => {
    setOverlayGrade(selectedGrade);
    setOverlayClassId(selectedClassId !== "all" ? selectedClassId : "all");
    setIsEditOverlayOpen(true);
  }, [selectedGrade, selectedClassId]);

  const reloadSlots = useCallback(async () => {
    if (!selectedWeekId) return;
    try {
      const rawSlots = await slotApi.getByWeek(selectedWeekId);
      setSlots(rawSlots.map(mapSlot));
    } catch { /* ignore */ }
  }, [selectedWeekId]);

  const handleCloseOverlay = useCallback(() => {
    if (hasDirtyChanges) setNavTarget("__close_overlay__");
    else setIsEditOverlayOpen(false);
  }, [hasDirtyChanges]);

  const handleViewConflict = useCallback(
    (slotIds: string[]) => {
      setHighlightedSlotIds(new Set(slotIds));
      if (!inTeacherView) setSelectedClassId("all");
      setTimeout(() => {
        const el = document.getElementById(`slot-${slotIds[0]}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedSlotIds(new Set()), 3000);
      }, 100);
    },
    [inTeacherView]
  );

  const handleExportExcel = useCallback(() => {
    let label = "";
    if (inTeacherView) {
      const teacher = teachers.find((t) => t.id.toString() === selectedTeacherId);
      label = `TKB giáo viên ${teacher?.fullName ?? selectedTeacherId}`;
    } else if (selectedClassId !== "all") {
      label = `TKB lớp ${selectedClassId}`;
    } else {
      label = `TKB khối ${selectedGrade}`;
    }
    setExportingLabel(label);
    setTimeout(() => {
      try {
        if (inTeacherView) {
          const teacher = teachers.find((t) => t.id.toString() === selectedTeacherId);
          exportTeacherTimetable(slots, selectedTeacherId, teacher?.fullName ?? selectedTeacherId);
        } else if (selectedClassId !== "all") {
          const cls = classes.find((c) => c.name === selectedClassId);
          exportClassTimetable(slots, selectedClassId, cls?.homeroomTeacherName ?? undefined);
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
  }, [inTeacherView, selectedTeacherId, selectedClassId, selectedGrade, slots, teachers, classes]);

  // ── Week dropdown shared render ───────────────────────
  const weekDropdown = (
    <select
      value={selectedWeekId ?? ""}
      onChange={(e) => handleWeekSelect(Number(e.target.value))}
      className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
    >
      {weeks.map((w) => {
        const fmt = (d: string) => `${parseInt(d.slice(8, 10))}/${parseInt(d.slice(5, 7))}`;
        const dateLabel = w.startDate && w.endDate ? ` (${fmt(w.startDate)} - ${fmt(w.endDate)})` : " (chưa có ngày)";
        return <option key={w.id} value={w.id}>{`Tuần ${w.weekNumber}${dateLabel}`}</option>;
      })}
    </select>
  );

  // ── Conflict panel render ─────────────────────────────
  const conflictPanel = allIssues.length > 0 ? (() => {
    const errors = allIssues.filter((i) => i.severity === "error");
    const warnings = allIssues.filter((i) => i.severity === "warning");
    const badge = (
      <span className="flex items-center gap-2 text-sm font-semibold">
        {errors.length > 0 && <span className="text-red-600">🔴 {errors.length} lỗi</span>}
        {errors.length > 0 && warnings.length > 0 && <span className="text-slate-300">·</span>}
        {warnings.length > 0 && <span className="text-amber-500">🟠 {warnings.length} cảnh báo</span>}
      </span>
    );
    return (
      <div className="fixed bottom-6 right-6 z-10000 flex flex-col items-end gap-2">
        <div
          className={`bg-white border border-slate-200 rounded-2xl shadow-xl w-96 overflow-hidden transition-all duration-200 origin-bottom ${
            floatingPanelOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            {badge}
            <button
              onClick={() => setFloatingPanelOpen(false)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors ml-4 shrink-0"
            >
              <ChevronDown className="h-3.5 w-3.5" /> Thu gọn
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {allIssues.map((issue) => (
              <div
                key={issue.key}
                className={`px-4 py-2.5 text-sm border-b border-slate-50 last:border-0 ${
                  issue.severity === "error" ? "text-red-700" : "text-amber-700"
                }`}
              >
                {issue.severity === "error" ? "🔴" : "🟠"} {issue.label}
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => setFloatingPanelOpen((v) => !v)}
          className="bg-white border border-slate-200 rounded-full shadow-lg px-4 py-2 hover:shadow-xl transition-shadow flex items-center gap-2"
        >
          {badge}
        </button>
      </div>
    );
  })() : null;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Đang tải thời khoá biểu...</div>;
  }

  return (
    <div className="p-8 flex flex-col gap-6 flex-1 min-h-0">
      {/* ── Header ── */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          {timetableId && (
            <button
              onClick={() => {
                const target = `/timetable${yearParam ? `?year=${yearParam}` : ""}`;
                if (hasDirtyChanges) setNavTarget(target);
                else router.push(target);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-2 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Danh sách TKB
            </button>
          )}
          <h2 className="text-2xl font-extrabold text-md-on-surface tracking-tight font-heading">
            {currentTimetable ? `HK${currentTimetable.semesterOrder} – ${currentTimetable.schoolYearName}` : "Thời khóa biểu"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setProgressModalOpen(true); setActiveProgressTab("progress"); }}
            className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium"
          >
            <BarChart2 className="h-4 w-4" /> Tiến độ
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <Button onClick={handleOpenOverlay} className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Cập nhật thời khoá biểu
          </Button>
        </div>
      </div>

      {/* ── Selector bar (view only) ── */}
      <div className="flex items-center gap-4 flex-wrap shrink-0">
        {!inTeacherView ? (
          <>
            <select
              value={selectedGrade}
              onChange={(e) => handleGradeSelect(Number(e.target.value))}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              {grades.map((g) => <option key={g} value={g}>Khối {g}</option>)}
            </select>

            <select
              value={selectedClassId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClassId(val);
                if (val !== "all") setProgressClassId(val);
              }}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              <option value="all">Cả khối</option>
              {gradeClasses.map((cls) => (
                <option key={cls.id} value={cls.name}>Lớp {cls.name}</option>
              ))}
            </select>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">GV:</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20 min-w-45"
            >
              {bmTeachers.map((t) => (
                <option key={t.id} value={t.id.toString()}>{t.fullName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {weeks.length > 0 && weekDropdown}
          <button
            onClick={() => setInTeacherView((v) => !v)}
            className={`flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${
              inTeacherView ? "bg-md-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {inTeacherView ? "Theo lớp" : "Theo GV"}
          </button>
        </div>
      </div>

      {/* ── Main read-only grid ── */}
      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {inTeacherView ? (
            <TeacherTimetableGrid
              teacherId={selectedTeacherId}
              slots={savedSlotsWithConflicts}
              teacherSlots={teacherSlots}
              onAddSlot={handleAddSlot}
              onDeleteSlot={handleDeleteSlot}
              readOnly={true}
              subjects={subjects}
              assignments={assignments.filter((a) => a.teacherId?.toString() === selectedTeacherId)}
            />
          ) : selectedClassId === "all" ? (
            <TimetableDragProvider>
              <GradeView
                grade={selectedGrade}
                slots={savedSlotsWithConflicts}
                classes={gradeClasses}
                subjects={subjects}
                assignments={assignments}
                readOnly={true}
                onSelectClass={(name) => { setSelectedClassId(name); setProgressClassId(name); }}
                onAddSlot={handleAddSlot}
                onDeleteSlot={handleDeleteSlot}
                highlightedSlotIds={highlightedSlotIds}
              />
            </TimetableDragProvider>
          ) : (
            <TimetableDragProvider>
              <TimetableGrid
                classId={selectedClassId}
                slots={savedSlotsWithConflicts}
                onAddSlot={handleAddSlot}
                onDeleteSlot={handleDeleteSlot}
                readOnly={true}
                subjects={gradeSubjects}
                assignments={classAssignments}
                currentClass={
                  currentClassObj ? {
                    id: currentClassObj.id, code: "", grade: currentClassObj.grade,
                    name: currentClassObj.name, studentCount: 0,
                    homeroomTeacher: currentClassObj.homeroomTeacherName ?? null,
                    homeroomTeacherId: currentClassObj.homeroomTeacherId ?? null,
                    assignmentStatus: currentClassObj.homeroomTeacherId ? "complete" : "incomplete",
                  } : undefined
                }
              />
            </TimetableDragProvider>
          )}
        </div>
      </div>

      {/* ── Edit overlay ── */}
      {isEditOverlayOpen && (
        <div className="fixed inset-0 z-9999 bg-white flex flex-col">
          {/* Overlay header */}
          <div className="shrink-0 px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-800 font-heading shrink-0 mr-1">Cập nhật thời khoá biểu</span>

            {/* Khối */}
            <select
              value={overlayGrade}
              onChange={(e) => { setOverlayGrade(Number(e.target.value)); setOverlayClassId("all"); }}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              {grades.map((g) => <option key={g} value={g}>Khối {g}</option>)}
            </select>

            {/* Lớp */}
            <select
              value={overlayClassId}
              onChange={(e) => setOverlayClassId(e.target.value)}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              <option value="all">Cả khối</option>
              {overlayGradeClasses.map((cls) => (
                <option key={cls.id} value={cls.name}>Lớp {cls.name}</option>
              ))}
            </select>

            {/* Tuần */}
            {weeks.length > 0 && weekDropdown}

            <div className="ml-auto flex items-center gap-3">
              {hasDirtyChanges && (
                <span className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  Chưa lưu
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !hasDirtyChanges}
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Đang lưu..." : `Lưu tuần ${selectedWeek?.weekNumber ?? ""}`}
              </Button>
              <Button
                onClick={() => setApplyForwardConfirmOpen(true)}
                disabled={saving || !hasDirtyChanges}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Áp dụng từ tuần {selectedWeek?.weekNumber ?? ""} trở đi →
              </Button>
              <button
                onClick={handleCloseOverlay}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Overlay body */}
          <div className="flex-1 overflow-auto p-6">
            <TimetableDragProvider>
              {overlayClassId === "all" ? (
                <GradeView
                  grade={overlayGrade}
                  slots={slotsWithConflicts}
                  classes={overlayGradeClasses}
                  subjects={subjects}
                  assignments={assignments}
                  readOnly={false}
                  onSelectClass={(name) => setOverlayClassId(name)}
                  onAddSlot={handleAddSlot}
                  onDeleteSlot={handleDeleteSlot}
                />
              ) : (
                <TimetableGrid
                  classId={overlayClassId}
                  slots={slotsWithConflicts}
                  onAddSlot={handleAddSlot}
                  onDeleteSlot={handleDeleteSlot}
                  readOnly={false}
                  subjects={overlayGradeSubjects}
                  assignments={overlayClassAssignments}
                  currentClass={
                    overlayClassObj ? {
                      id: overlayClassObj.id, code: "", grade: overlayClassObj.grade,
                      name: overlayClassObj.name, studentCount: 0,
                      homeroomTeacher: overlayClassObj.homeroomTeacherName ?? null,
                      homeroomTeacherId: overlayClassObj.homeroomTeacherId ?? null,
                      assignmentStatus: overlayClassObj.homeroomTeacherId ? "complete" : "incomplete",
                    } : undefined
                  }
                />
              )}
            </TimetableDragProvider>
          </div>

          {/* Conflict panel inside overlay */}
          {conflictPanel}
        </div>
      )}

      {/* ── Dialogs ── */}
      <AlertDialog open={!!navTarget} onOpenChange={(open) => { if (!open) setNavTarget(null); }}>
        <AlertDialogContent className="z-10001">
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có thay đổi chưa lưu</AlertDialogTitle>
            <AlertDialogDescription>
              {navTarget === "__close_overlay__"
                ? `Đóng sẽ huỷ ${pendingAdds.size + pendingDeletes.size} thay đổi chưa lưu. Tiếp tục?`
                : `Rời khỏi trang sẽ huỷ ${pendingAdds.size + pendingDeletes.size} thay đổi chưa lưu. Tiếp tục?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = navTarget;
                setNavTarget(null);
                setPendingAdds(new Map());
                setPendingDeletes(new Set());
                if (target === "__pop__") router.back();
                else if (target === "__close_overlay__") { setIsEditOverlayOpen(false); reloadSlots(); }
                else if (target) router.push(target);
              }}
            >
              {navTarget === "__close_overlay__" ? "Đóng" : "Rời khỏi trang"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!weekSwitchTarget} onOpenChange={(open) => { if (!open) setWeekSwitchTarget(null); }}>
        <AlertDialogContent className="z-10001">
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có thay đổi chưa lưu</AlertDialogTitle>
            <AlertDialogDescription>
              Chuyển tuần sẽ huỷ {pendingAdds.size + pendingDeletes.size} thay đổi chưa lưu. Tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ở lại</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWeekSwitch}>Bỏ qua thay đổi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!pendingAdd} onOpenChange={(open) => { if (!open) setPendingAdd(null); }}>
        <DialogContent className="max-w-sm rounded-2xl z-10001">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> Phát hiện trùng lịch
            </DialogTitle>
          </DialogHeader>
          {pendingAdd && (() => {
            const cs = pendingAdd.conflictingSlot;
            const dayLabel = DAYS.find((d) => d.value === cs.day)?.label ?? "";
            const session = SESSIONS.find((s) => (s.periods as readonly number[]).includes(cs.period));
            const periodLabel = session ? `${session.label} T${cs.period - session.periods[0] + 1}` : `Tiết ${cs.period}`;
            return (
              <p className="text-sm text-slate-600 py-2">
                Bạn có muốn xoá tiết <span className="font-semibold text-slate-800">{cs.subjectName}</span> ở lớp{" "}
                <span className="font-semibold text-slate-800">{cs.classId}</span>, {dayLabel}, {periodLabel} và xếp{" "}
                <span className="font-semibold text-slate-800">{pendingAdd.params.subjectName}</span> vào lớp{" "}
                <span className="font-semibold text-slate-800">{pendingAdd.params.classId}</span> không?
              </p>
            );
          })()}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPendingAdd(null)}>Huỷ</Button>
            <Button onClick={handleConfirmAdd}>Tiếp tục</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={progressModalOpen} onOpenChange={setProgressModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="font-heading text-lg font-bold">Tiến độ & Khối lượng</DialogTitle>
          </DialogHeader>
          <div className="flex border-b border-slate-200 px-6 mt-3">
            {([{ key: "progress", label: "Tiến độ theo lớp" }, { key: "workload", label: "Khối lượng giảng dạy" }] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveProgressTab(key)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                  activeProgressTab === key ? "border-md-primary text-md-primary" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeProgressTab === "progress" ? (
              <div className="space-y-4">
                {grades.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Khối:</span>
                    {grades.map((g) => (
                      <button key={g} onClick={() => handleProgressGradeChange(g)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                          progressGrade === g ? "bg-md-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}>
                        {g}
                      </button>
                    ))}
                  </div>
                )}
                {progressGradeClasses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không có lớp nào</p>
                ) : (
                  <div className="space-y-3">
                    {progressGradeClasses.map((cls) => {
                      const filled = slotsWithConflicts.filter((s) => s.classId === cls.name).length;
                      const clsAssignments = assignments.filter((a) => a.className === cls.name);
                      const required = progressGradeSubjects.reduce((sum, sub) => {
                        const a = clsAssignments.find((x) => x.subjectId === sub.id);
                        return sum + (a?.periodsPerWeek ?? sub.periodsByGrade[progressGrade - 1]);
                      }, 0);
                      const done = required > 0 && filled >= required;
                      return (
                        <div key={cls.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                              Lớp {cls.name}
                              {done && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                            </span>
                            <span className={`text-[11px] font-semibold shrink-0 ml-2 ${done ? "text-emerald-600" : "text-slate-500"}`}>
                              {filled}/{required}t
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${done ? "bg-emerald-400" : "bg-md-primary"}`}
                              style={{ width: `${required > 0 ? Math.min((filled / required) * 100, 100) : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {teachers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có giáo viên</p>
                ) : (
                  teachers.map((t) => {
                    const current = slotsWithConflicts.filter((s) => s.teacherId === t.id.toString()).length;
                    const ratio = current / t.maxPeriodsPerWeek;
                    const overflow = ratio > 1;
                    const full = ratio >= 1 && !overflow;
                    return (
                      <div key={t.id}>
                        <div className="flex items-center justify-between mb-1 gap-1">
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-slate-700 truncate block">{t.fullName}</span>
                            <span className="text-[10px] text-slate-400">{t.type === "CHU_NHIEM" ? "GVCN" : "Bộ môn"}</span>
                          </div>
                          {overflow && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 font-semibold shrink-0">⚠ Vượt</span>}
                          {full && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-semibold shrink-0">✓ Đủ</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${overflow ? "bg-amber-400" : full ? "bg-emerald-400" : "bg-blue-400"}`}
                              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold shrink-0 ${overflow ? "text-amber-600" : "text-slate-400"}`}>
                            {current}/{t.maxPeriodsPerWeek}t
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={applyForwardConfirmOpen} onOpenChange={setApplyForwardConfirmOpen}>
        <AlertDialogContent className="z-10001">
          <AlertDialogHeader>
            <AlertDialogTitle>Áp dụng từ tuần {selectedWeek?.weekNumber} trở đi?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ lưu TKB tuần {selectedWeek?.weekNumber} và sao chép toàn bộ sang tất cả các tuần tiếp theo.
              Dữ liệu TKB của các tuần sau sẽ bị ghi đè.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApplyForward}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Xác nhận áp dụng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}

/** Teacher schedule grid — days as columns, periods as rows */
function TeacherTimetableGrid({
  teacherId, slots, teacherSlots, onAddSlot, onDeleteSlot, readOnly = false, subjects, assignments,
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
  const getSlot = (day: number, period: number) => teacherSlots.find((s) => s.day === day && s.period === period);

  return (
    <div className="bg-md-surface-container rounded-2xl overflow-hidden p-0.5">
      <div className="grid bg-md-surface-container-high text-md-on-surface-variant font-bold text-[11px] uppercase tracking-wider py-3 text-center"
        style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}>
        <div>Tiết</div>
        {DAYS.map((d) => <div key={d.value}>{d.label}</div>)}
      </div>
      <div className="bg-md-surface-container flex flex-col gap-0.5">
        {PERIODS.map((period) => (
          <div key={period} className="grid gap-0.5" style={{ gridTemplateColumns: "80px repeat(5, 1fr)" }}>
            <div className="bg-md-surface-container-lowest flex items-center justify-center font-bold text-slate-500 min-h-20">{period}</div>
            {DAYS.map((day) => {
              const slot = getSlot(day.value, period);
              if (slot) {
                return (
                  <CellPopover key={`${day.value}-${period}`} slot={slot} day={day.value} period={period}
                    classId={slot.classId} allSlots={slots} onAddSlot={onAddSlot} onDeleteSlot={onDeleteSlot}
                    readOnly={readOnly} subjects={subjects} assignments={assignments}>
                    <div className={`min-h-20 p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-sm border-l-[3px] ${
                      slot.isConflict ? "bg-red-100 border-red-500" : "bg-white border-md-primary"
                    }`}>
                      <span className={`text-xs font-bold ${slot.isConflict ? "text-red-700" : "text-md-on-surface"}`}>{slot.subjectName}</span>
                      <div>
                        <span className="text-[10px] text-md-primary font-medium">Lớp {slot.classId}</span>
                        {slot.isConflict && <p className="text-[10px] text-red-500 font-medium">⚠ Trùng lịch</p>}
                      </div>
                    </div>
                  </CellPopover>
                );
              }
              return (
                <TeacherEmptyCellPopover key={`${day.value}-${period}`} day={day.value} period={period}
                  allSlots={slots} teacherAssignments={assignments} onAddSlot={onAddSlot} readOnly={readOnly} teacherId={teacherId} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeacherEmptyCellPopover({
  day, period, allSlots, teacherAssignments, onAddSlot, readOnly, teacherId,
}: {
  day: number; period: number; allSlots: Slot[];
  teacherAssignments: AssignmentResponse[];
  onAddSlot: (params: AddSlotParams) => void;
  readOnly: boolean; teacherId: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const dayLabel = DAYS.find((d) => d.value === day)?.label ?? "";
  const busyClasses = new Set(allSlots.filter((s) => s.day === day && s.period === period).map((s) => s.classId));
  const teacherBusy = allSlots.some((s) => s.day === day && s.period === period && s.teacherId === teacherId);
  const selected = teacherAssignments.find((a) => a.id === selectedId);

  const handleSave = () => {
    if (!selected) return;
    onAddSlot({
      assignmentId: selected.id, day, period, classId: selected.className,
      subjectId: selected.subjectId.toString(), subjectName: selected.subjectName,
      teacherId: selected.teacherId?.toString() ?? null, teacherName: selected.teacherName,
    });
    setOpen(false);
    setSelectedId("");
  };

  if (readOnly) return <div className="bg-md-surface-container-lowest min-h-20 rounded-sm" />;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelectedId(""); }}>
      <PopoverTrigger asChild>
        <div className="bg-md-surface-container-lowest min-h-20 rounded-sm cursor-pointer hover:bg-md-surface-container transition-colors" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 rounded-xl z-10000" align="start">
        <p className="font-semibold text-sm mb-0.5">Xếp tiết</p>
        <p className="text-xs text-slate-400 mb-3">{dayLabel} · Tiết {period}</p>
        {teacherBusy && (
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 rounded-lg px-2.5 py-2 mb-3 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> GV đã có lịch tiết này
          </div>
        )}
        <label className="text-[11px] uppercase tracking-wider font-medium text-slate-500 block mb-1">Lớp / Môn</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-slate-50 mb-4 focus:ring-md-primary"
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
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => setOpen(false)}>Hủy</Button>
          <Button size="sm" className="flex-1"
            disabled={!selectedId || (selected ? busyClasses.has(selected.className) : false)}
            onClick={handleSave}>
            Xếp tiết
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
