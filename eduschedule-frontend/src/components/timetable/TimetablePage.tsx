"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  type Slot,
  DAYS,
  PERIODS,
  SESSIONS,
  mapSlot,
} from "@/lib/timetable-data";
import { findHardViolations, violationsBySlotId } from "@/lib/timetable-constraints";
import { onSpecialRoomsChanged } from "@/lib/special-room-events";
import { TimetableGrid } from "./TimetableGrid";
import { GradeView } from "./GradeView";
import { CellPopover } from "./CellPopover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileSpreadsheet, AlertTriangle, Users, ArrowLeft, BarChart2,
  Check, ChevronDown, Save, X, Pencil, Sparkles, Globe, Lock,
  // Trash2, // dùng cho nút "Xoá tất cả sắp xếp" — xem ghi chú ở handleClearAll
} from "lucide-react";
import { PublishTimetableDialog } from "./PublishTimetableDialog";
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
  type AutoScheduleResult,
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

  const [selectedGrade, setSelectedGrade] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [inTeacherView, setInTeacherView] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [progressClassId, setProgressClassId] = useState<string>("");
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressGrade, setProgressGrade] = useState(1);
  const [highlightedSlotIds, setHighlightedSlotIds] = useState<Set<string>>(new Set());

  const [isEditOverlayOpen, setIsEditOverlayOpen] = useState(false);
  const [overlayGrade, setOverlayGrade] = useState(1);
  const [overlayClassId, setOverlayClassId] = useState<string>("all");
  const [floatingPanelOpen, setFloatingPanelOpen] = useState(false);
  const [applyForwardConfirmOpen, setApplyForwardConfirmOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

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
  const [autoScheduleDialogOpen, setAutoScheduleDialogOpen] = useState(false);
  const [autoScheduleErrors, setAutoScheduleErrors] = useState<{ className: string; subjects: string[] }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saveBeforeAutoOpen, setSaveBeforeAutoOpen] = useState(false);
  // const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);

  const hasDirtyChanges = pendingAdds.size > 0 || pendingDeletes.size > 0;

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

  const effectiveYear = timetableId ? currentTimetable?.schoolYearName ?? null : yearParam;

  useEffect(() => {
    if (timetableId && !currentTimetable) return;
    Promise.all([teacherApi.getAll(effectiveYear), subjectApi.getAll(), classApi.getAll(effectiveYear), assignmentApi.getAll(effectiveYear), specialRoomApi.getAll()])
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
        const firstBm = t.find((x) => x.homeroomClassName == null);
        if (firstBm) setSelectedTeacherId(firstBm.id.toString());
      })
      .catch(() => toast.error("Không thể tải dữ liệu"));
  }, [effectiveYear, timetableId, currentTimetable]);

  useEffect(
    () =>
      onSpecialRoomsChanged(() => {
        specialRoomApi.getAll()
          .then(setSpecialRooms)
          .catch(() => toast.error("Không thể tải phòng chức năng"));
      }),
    []
  );

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
    if (!timetableId || !currentTimetable) return;
    if (yearParam === currentTimetable.schoolYearName) return;
    router.replace(
      `/timetable/${currentTimetable.id}?year=${encodeURIComponent(currentTimetable.schoolYearName)}`
    );
  }, [timetableId, currentTimetable, yearParam, router]);

  useEffect(() => {
    if (!selectedWeekId) { setSlots([]); return; }
    slotApi.getByWeek(selectedWeekId)
      .then((rawSlots) => setSlots(rawSlots.map(mapSlot)))
      .catch(() => toast.error("Không thể tải tiết học"));
  }, [selectedWeekId]);

  const refreshWeeks = useCallback(async () => {
    if (!currentTimetable) return;
    const w = await weekApi.getByTimetable(currentTimetable.id);
    setWeeks(w);
  }, [currentTimetable]);

  const handleUnpublishWeek = useCallback(async () => {
    if (!currentTimetable || !selectedWeekId) return;
    try {
      await timetableApi.unpublishWeek(currentTimetable.id, selectedWeekId);
      await refreshWeeks();
      toast.success("Đã hủy công bố tuần này");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể hủy công bố");
    }
  }, [currentTimetable, selectedWeekId, refreshWeeks]);

  // ── Derived ───────────────────────────────────────────
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

  const selectedWeek = useMemo(() => weeks.find((w) => w.id === selectedWeekId) ?? null, [weeks, selectedWeekId]);

  // Mọi vi phạm ràng buộc bắt buộc của lưới hiện tại, tính cả các tiết chưa lưu. Luật nằm trong
  // lib/timetable-constraints.ts, viết song song với TimetableConstraintProvider.java phía backend.
  //
  // Tuần đã công bố thì không kiểm tra gì nữa: lưới đã bị khoá không sửa được, và dữ liệu nền
  // (phòng chức năng, phân công...) có thể đã đổi sau lúc công bố nên báo lỗi chỉ gây nhiễu.
  const hardViolations = useMemo(
    () => (selectedWeek?.isPublished ? [] : findHardViolations(slots, specialRooms)),
    [slots, specialRooms, selectedWeek]
  );
  const violationsBySlot = useMemo(() => violationsBySlotId(hardViolations), [hardViolations]);

  const slotsWithConflicts = useMemo(
    () =>
      slots.map((s) => {
        const kinds = violationsBySlot.get(s.id) ?? [];
        return {
          ...s,
          isConflict: kinds.includes("teacher") || kinds.includes("class"),
          isRoomConflict: kinds.includes("room"),
          isRuleViolation: kinds.includes("gap") || kinds.includes("afternoon"),
        };
      }),
    [slots, violationsBySlot]
  );
  const savedSlotsWithConflicts = useMemo(() => slotsWithConflicts.filter((s) => !s.isDirty), [slotsWithConflicts]);
  const teacherSlots = useMemo(() => savedSlotsWithConflicts.filter((s) => s.teacherId === selectedTeacherId), [savedSlotsWithConflicts, selectedTeacherId]);

  // Cả 5 ràng buộc đều là điều kiện bắt buộc để công khai tuần, nên không có mức "cảnh báo".
  const allIssues = useMemo(
    () => hardViolations.map((v) => ({ key: v.key, label: v.label, slotIds: v.slotIds })),
    [hardViolations]
  );

  const progressGradeClasses = useMemo(
    () => classes.filter((c) => c.grade === progressGrade).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [classes, progressGrade]
  );
  const progressGradeSubjects = useMemo(
    () => subjects.filter((s) => s.periodsByGrade[progressGrade - 1] > 0),
    [subjects, progressGrade]
  );

  // Không còn môn nào có thể tự động xếp — mọi lớp đã đủ số tiết yêu cầu
  const noSubjectsToSchedule = useMemo(() => {
    if (classes.length === 0) return false;
    return classes.every((cls) => {
      const clsSubjects = subjects.filter((s) => s.periodsByGrade[cls.grade - 1] > 0);
      const clsAssignments = assignments.filter((a) => a.className === cls.name);
      const required = clsSubjects.reduce((sum, sub) => {
        const a = clsAssignments.find((x) => x.subjectId === sub.id);
        return sum + (a?.periodsPerWeek ?? sub.periodsByGrade[cls.grade - 1]);
      }, 0);
      if (required === 0) return true;
      const filled = slotsWithConflicts.filter((s) => s.classId === cls.name).length;
      return filled >= required;
    });
  }, [classes, subjects, assignments, slotsWithConflicts]);

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
      if (selectedWeek?.isPublished) {
        toast.error("Tuần đã công bố, cần hủy công bố trước khi chỉnh sửa");
        return;
      }

      // Room conflict check — block immediately
      const subjectId = params.subjectNumericId ?? Number(params.subjectId);
      const room = specialRooms.find((r) => r.subjectId === subjectId);
      if (room) {
        const concurrentSlots = slots.filter(
          (s) => s.day === params.day && s.period === params.period && s.subjectId === params.subjectId
        );
        if (concurrentSlots.length >= room.quantity) {
          const dayLabel = DAYS.find((d) => d.value === params.day)?.label ?? `Thứ ${params.day}`;
          const session = SESSIONS.find((s) => (s.periods as readonly number[]).includes(params.period));
          const sessionLabel = session?.label ?? "";
          const classNames = concurrentSlots.map((s) => `lớp ${s.classId}`).join(", ");
          toast.error(
            `Phòng ${room.name} (${params.subjectName}) đã có ${classNames} tiết ${params.period} ${sessionLabel} ${dayLabel}. Hãy chọn một tiết khác để xếp ${params.subjectName}.`,
            { duration: 6000 }
          );
          return;
        }
      }

      // Teacher conflict check
      if (params.assignmentId && params.teacherId) {
        const conflictingSlot = slots.find(
          (s) => s.day === params.day && s.period === params.period && s.teacherId === params.teacherId && s.classId !== params.classId
        );
        if (conflictingSlot) { setPendingAdd({ params, conflictingSlot }); return; }
      }
      markDirtyAdd(params);
    },
    [selectedWeekId, selectedWeek, slots, specialRooms, markDirtyAdd]
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
      if (selectedWeek?.isPublished) {
        toast.error("Tuần đã công bố, cần hủy công bố trước khi chỉnh sửa");
        return;
      }
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
    [slots, selectedWeek]
  );

  // ── "Xoá tất cả sắp xếp" — TẠM TẮT ────────────────────────────────────────
  // Chức năng đã hiện thực và chạy được, nhưng không nằm trong đặc tả use case của báo cáo
  // (UC04 chỉ mô tả xếp/đổi/xoá từng tiết). Tạm comment lại để phạm vi sản phẩm khớp với phần
  // đặc tả; bỏ comment bốn khối bên dưới cùng import Trash2 và state clearAllConfirmOpen là
  // dùng lại được.
  //
  // Xoá toàn bộ tiết của tuần đang chọn, ở mọi khối — `slots` được tải theo tuần nên đã chứa
  // tất cả các lớp, không riêng khối đang xem. Chỉ dọn ở phía giao diện: các tiết đã lưu được
  // đưa vào pendingDeletes để lần bấm "Lưu" tiếp theo mới thực sự gọi API xoá.
  //
  // const handleClearAll = useCallback(() => {
  //   if (selectedWeek?.isPublished) {
  //     toast.error("Tuần đã công bố, cần hủy công bố trước khi chỉnh sửa");
  //     return;
  //   }
  //   const savedApiIds = slots.filter((s) => !s.isDirty && s.apiId).map((s) => s.apiId!);
  //   setPendingDeletes((prev) => new Set([...prev, ...savedApiIds]));
  //   setPendingAdds(new Map());
  //   setSlots([]);
  //   setClearAllConfirmOpen(false);
  //   toast.success(`Đã xoá ${slots.length} tiết — bấm "Lưu" để áp dụng`, { duration: 3000 });
  // }, [slots, selectedWeek]);

  // Trả về true nếu đã ghi xong xuống DB — luồng "lưu rồi xếp tự động" cần biết có được đi tiếp không.
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!selectedWeekId || saving || !hasDirtyChanges) return false;
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
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể lưu thay đổi");
      return false;
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

  // Chạy thuật toán. Chỉ được gọi khi tuần không còn thay đổi chưa lưu: backend đọc tiết đã xếp
  // từ DB (ScheduleGeneratorService.generate) nên tiết còn nằm trong pendingAdds sẽ vô hình với
  // solver — không được ghim, không được trừ vào số tiết còn thiếu, và bị kết quả trả về ghi đè.
  const runAutoSchedule = useCallback(async () => {
    if (selectedWeek?.isPublished) {
      toast.error("Tuần đã công bố, cần hủy công bố trước khi xếp lại");
      return;
    }
    if (noSubjectsToSchedule) {
      toast.info("Đã xếp đủ tiết");
      return;
    }

    // 1. Check all subjects are assigned
    const unassigned: { className: string; subjects: string[] }[] = [];
    for (const cls of classes) {
      const clsSubjects = subjects.filter((s) => s.periodsByGrade[cls.grade - 1] > 0);
      const missing = clsSubjects.filter(
        (sub) => !assignments.some((a) => a.classId === cls.id && a.subjectId === sub.id)
      );
      if (missing.length > 0) {
        unassigned.push({ className: cls.name, subjects: missing.map((s) => s.name) });
      }
    }
    if (unassigned.length > 0) {
      setAutoScheduleErrors(unassigned);
      setAutoScheduleDialogOpen(true);
      return;
    }

    if (!selectedWeekId) { toast.error("Chưa chọn tuần"); return; }

    // 2. Call generate API
    setGenerating(true);
    let result: AutoScheduleResult;
    try {
      result = await weekApi.generate(selectedWeekId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi xếp tự động");
      setGenerating(false);
      return;
    } finally {
      setGenerating(false);
    }

    const totalAttempted = result.slots.length + result.errors.length;
    if (totalAttempted === 0) {
      toast.info("Đã xếp đủ tiết");
      return;
    }

    // 3. Batch-add whatever got successfully placed as dirty/pending — xếp được một phần vẫn
    // hiển thị lên lưới, không coi "còn tiết chưa xếp được" là thất bại toàn bộ.
    setSlots((prev) => {
      let next = [...prev];
      for (const s of result.slots) {
        next = next.filter((x) => !(x.classId === s.className && x.day === s.day && x.period === s.period));
        next.push({
          id: `dirty-${s.day}-${s.period}-${s.className}`,
          assignmentId: s.assignmentId,
          day: s.day,
          period: s.period,
          classId: s.className,
          subjectId: s.subjectId.toString(),
          subjectName: s.subjectName,
          teacherId: s.teacherId != null ? s.teacherId.toString() : null,
          teacherName: s.teacherName,
          isConflict: false,
          isDirty: true,
        });
      }
      return next;
    });
    setPendingAdds((prev) => {
      const next = new Map(prev);
      for (const s of result.slots) {
        next.set(`${s.day}-${s.period}-${s.className}`, {
          assignmentId: s.assignmentId,
          classNumericId: s.classId,
          subjectNumericId: s.subjectId,
          day: s.day,
          period: s.period,
          subjectName: s.subjectName,
          teacherId: s.teacherId != null ? s.teacherId.toString() : null,
          teacherName: s.teacherName,
          subjectId: s.subjectId.toString(),
          classId: s.className,
        });
      }
      return next;
    });
    const summary = `Đã xếp tự động ${result.slots.length}/${totalAttempted} tiết. Còn lại ${result.errors.length} tiết chưa xếp được.`;
    if (result.errors.length > 0) {
      toast.warning(summary, { duration: 6000 });
    } else {
      toast.success(summary, { duration: 4000 });
    }
  }, [classes, subjects, assignments, selectedWeekId, selectedWeek, noSubjectsToSchedule]);

  const handleAutoSchedule = useCallback(() => {
    if (hasDirtyChanges) {
      setSaveBeforeAutoOpen(true);
      return;
    }
    void runAutoSchedule();
  }, [hasDirtyChanges, runAutoSchedule]);

  const confirmSaveThenAutoSchedule = useCallback(async () => {
    setSaveBeforeAutoOpen(false);
    if (await handleSave()) await runAutoSchedule();
  }, [handleSave, runAutoSchedule]);

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
    setTimeout(async () => {
      try {
        if (!currentTimetable || !selectedWeek) {
          toast.error("Chưa chọn tuần");
          return;
        }
        const meta = {
          weekNumber: selectedWeek.weekNumber,
          semesterOrder: currentTimetable.semesterOrder,
          schoolYearName: currentTimetable.schoolYearName,
          startDate: selectedWeek.startDate,
          endDate: selectedWeek.endDate,
        };
        if (inTeacherView) {
          const teacher = teachers.find((t) => t.id.toString() === selectedTeacherId);
          await exportTeacherTimetable(slots, selectedTeacherId, teacher?.fullName ?? selectedTeacherId, meta);
        } else if (selectedClassId !== "all") {
          const cls = classes.find((c) => c.name === selectedClassId);
          await exportClassTimetable(slots, selectedClassId, meta, cls?.homeroomTeacherName ?? undefined);
        } else {
          await exportGradeTimetable(slots, selectedGrade, classes, meta);
        }
        toast.success(`Đã xuất ${label}`);
      } catch {
        toast.error("Xuất file thất bại");
      } finally {
        setExportingLabel(null);
      }
    }, 80);
  }, [inTeacherView, selectedTeacherId, selectedClassId, selectedGrade, slots, teachers, classes, currentTimetable, selectedWeek]);

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

  const conflictPanel = allIssues.length > 0 ? (() => {
    const badge = (
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-red-600">🔴 {allIssues.length} lỗi</span>
      </span>
    );
    // Bảng lỗi được đặt absolute phía trên nút, nên khung ngoài chỉ rộng đúng bằng nút bấm. Nếu để
    // bảng nằm trong luồng flex, khung ngoài sẽ chiếm nguyên vùng w-96 ở góc dưới phải kể cả lúc
    // bảng đang thu gọn và nuốt click vào các ô thời khoá biểu nằm dưới.
    return (
      <div className="fixed bottom-6 right-6 z-10000 flex flex-col items-end">
        <div
          className={`absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl w-96 overflow-hidden transition-all duration-200 origin-bottom ${
            floatingPanelOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-2 scale-95 pointer-events-none"
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
              <button
                key={issue.key}
                onClick={() => handleViewConflict(issue.slotIds)}
                title="Xem vị trí trên lưới"
                className="block w-full text-left px-4 py-2.5 text-sm border-b border-slate-50 last:border-0 text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                🔴 {issue.label}
              </button>
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
            onClick={() => setProgressModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium"
          >
            <BarChart2 className="h-4 w-4" /> Tiến độ
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium"
          >
            <FileSpreadsheet className="h-4 w-4" />Xuất Excel
          </button>
          <button
            onClick={() => setPublishDialogOpen(true)}
            disabled={weeks.length === 0}
            title={weeks.length === 0 ? "Chưa có tuần nào để công khai" : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Globe className="h-4 w-4" /> Công khai thời khoá biểu
          </button>
          <Button onClick={handleOpenOverlay} className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Cập nhật thời khoá biểu
          </Button>
        </div>
      </div>

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
              {teachers.map((t) => (
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

      {isEditOverlayOpen && (
        <div className="fixed inset-0 z-9999 bg-white flex flex-col">
          <div className="shrink-0 px-6 py-3 bg-white border-b border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 font-heading">Cập nhật thời khoá biểu</span>
              <button
                onClick={handleCloseOverlay}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={overlayGrade}
                onChange={(e) => { setOverlayGrade(Number(e.target.value)); setOverlayClassId("all"); }}
                className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
              >
                {grades.map((g) => <option key={g} value={g}>Khối {g}</option>)}
              </select>

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

              {weeks.length > 0 && weekDropdown}

              <div className="ml-auto flex items-center gap-3">
                {hasDirtyChanges && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    Chưa lưu
                  </span>
                )}
                <button
                  onClick={() => setProgressModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-md-surface-container-low text-md-on-surface hover:bg-md-surface-container-high transition-colors rounded-full text-sm font-medium"
                >
                  <BarChart2 className="h-3.5 w-3.5" /> Tiến độ
                </button>
                {!selectedWeek?.isPublished && (
                  <>
                    <Button
                      onClick={handleAutoSchedule}
                      disabled={saving || generating || noSubjectsToSchedule}
                      size="sm"
                      variant="outline"
                      title={noSubjectsToSchedule ? "Đã xếp đủ tiết" : "Tự động xếp các tiết chưa được sắp xếp, giữ nguyên các tiết đã xếp"}
                      className="flex items-center gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {generating ? "Đang xếp..." : noSubjectsToSchedule ? "Đã xếp đủ tiết" : "Tự động xếp TKB"}
                    </Button>
                    {/* "Xoá tất cả sắp xếp" — tạm tắt, xem ghi chú ở handleClearAll
                    <Button
                      onClick={() => setClearAllConfirmOpen(true)}
                      disabled={saving || generating || slots.length === 0}
                      size="sm"
                      variant="outline"
                      title={slots.length === 0 ? "Tuần này chưa có tiết nào" : "Xoá toàn bộ tiết đã xếp của tuần này, ở tất cả các khối"}
                      className="flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoá tất cả sắp xếp
                    </Button>
                    */}
                    <Button
                      onClick={handleSave}
                      disabled={saving || !hasDirtyChanges}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? "Đang lưu..." : `Lưu tuần ${selectedWeek?.weekNumber ?? ""}${selectedWeek?.startDate ? ` (${selectedWeek.startDate})` : ""}`}
                    </Button>
                    <Button
                      onClick={() => setApplyForwardConfirmOpen(true)}
                      disabled={saving || !hasDirtyChanges}
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      Áp dụng từ tuần {selectedWeek?.weekNumber ?? ""}{selectedWeek?.startDate ? ` (${selectedWeek.startDate})` : ""} trở đi →
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {selectedWeek?.isPublished && (
            <div className="shrink-0 px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-sm text-amber-800">
              <Lock className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                Tuần {selectedWeek.weekNumber} đã công bố — hủy công bố để chỉnh sửa.
              </span>
              <Button
                onClick={handleUnpublishWeek}
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Hủy công bố tuần này
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-auto p-6">
            <TimetableDragProvider>
              {overlayClassId === "all" ? (
                <GradeView
                  grade={overlayGrade}
                  slots={slotsWithConflicts}
                  classes={overlayGradeClasses}
                  subjects={subjects}
                  assignments={assignments}
                  readOnly={selectedWeek?.isPublished ?? false}
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
                  readOnly={selectedWeek?.isPublished ?? false}
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

          {conflictPanel}
        </div>
      )}

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

      {/* Hộp thoại xác nhận của "Xoá tất cả sắp xếp" — tạm tắt, xem ghi chú ở handleClearAll
      <AlertDialog open={clearAllConfirmOpen} onOpenChange={setClearAllConfirmOpen}>
        <AlertDialogContent className="z-10001">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá tất cả sắp xếp?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ {slots.length} tiết đã xếp của tuần {selectedWeek?.weekNumber ?? ""}
              {selectedWeek?.startDate ? ` (${selectedWeek.startDate})` : ""} sẽ bị xoá khỏi lưới,
              ở <span className="font-semibold">tất cả các khối</span> chứ không riêng khối đang xem.
              Thay đổi chỉ được ghi lại khi bạn bấm &ldquo;Lưu&rdquo;; đóng màn hình mà không lưu thì
              thời khoá biểu giữ nguyên như cũ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Xoá tất cả
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      */}

      <AlertDialog open={saveBeforeAutoOpen} onOpenChange={setSaveBeforeAutoOpen}>
        <AlertDialogContent className="z-10001">
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu thay đổi trước khi xếp tự động?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang có {pendingAdds.size + pendingDeletes.size} thay đổi chưa lưu. Thuật toán chỉ
              giữ cố định những tiết đã lưu, nên các tiết vừa xếp tay sẽ bị bỏ qua và có thể bị kết
              quả tự động ghi đè. Hệ thống sẽ lưu các thay đổi này rồi mới chạy xếp tự động.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveThenAutoSchedule}>Lưu và xếp tự động</AlertDialogAction>
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
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden z-10001">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="font-heading text-lg font-bold">Tiến độ & Khối lượng</DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
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
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={applyForwardConfirmOpen} onOpenChange={setApplyForwardConfirmOpen}>
        <AlertDialogContent className="z-10001">
          <AlertDialogHeader>
            <AlertDialogTitle>Áp dụng từ tuần {selectedWeek?.weekNumber}{selectedWeek?.startDate ? ` (${selectedWeek.startDate})` : ""} trở đi?</AlertDialogTitle>
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

      {currentTimetable && (
        <PublishTimetableDialog
          timetableId={currentTimetable.id}
          isPublic={currentTimetable.isPublic}
          publicToken={currentTimetable.publicToken}
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          onChanged={(updated) => { setCurrentTimetable(updated); refreshWeeks(); }}
        />
      )}

      <Dialog open={autoScheduleDialogOpen} onOpenChange={setAutoScheduleDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden z-10001">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="font-heading text-base font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Không thể xếp tự động
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-3">
            <p className="text-sm text-slate-600 mb-4">
              Vẫn còn môn học chưa được phân công giáo viên.<br />
              Vui lòng hoàn tất phân công giảng dạy trước khi xếp thời khóa biểu.
            </p>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 max-h-52 overflow-y-auto">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Chi tiết</p>
              {autoScheduleErrors.map(({ className, subjects }) => (
                <div key={className} className="text-sm text-slate-700 mb-1 leading-snug">
                  <span className="font-semibold">Lớp {className}:</span>{" "}
                  <span className="text-slate-500">{subjects.join(", ")}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAutoScheduleDialogOpen(false)}>
                Đóng
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAutoScheduleDialogOpen(false);
                  router.push(`/assignments${yearParam ? `?year=${yearParam}` : ""}`);
                }}
              >
                Đến phân công giảng dạy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {generating && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/45"
          style={{ zIndex: 99999 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-10 flex flex-col items-center gap-6 w-full max-w-sm mx-4">
            <div className="w-14 h-14 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-bold text-slate-800 text-[17px] font-heading leading-snug">
                Đang xếp thời khóa biểu...
              </p>
              <p className="text-sm text-slate-500 mt-2.5 leading-relaxed">
                Hệ thống đang tự động sắp xếp thời khóa biểu.<br />
                Vui lòng không đóng hoặc tải lại trang.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

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
export function TeacherTimetableGrid({
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
  // Một khung giờ có thể chứa nhiều tiết của cùng giáo viên (GV bị xếp trùng ở nhiều lớp). Lấy cả
  // nhóm chứ không chỉ tiết đầu tiên, để ô hiển thị đủ tên các lớp thay vì giấu bớt lớp bị trùng.
  const getSlots = (day: number, period: number) =>
    teacherSlots.filter((s) => s.day === day && s.period === period);

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
              const cellSlots = getSlots(day.value, period);
              const slot = cellSlots[0];
              if (slot) {
                const subjectNames = [...new Set(cellSlots.map((s) => s.subjectName))].join(" / ");
                const classNames = cellSlots.map((s) => s.classId).join(", ");
                const hasConflict = cellSlots.some((s) => s.isConflict);
                const hasRoomConflict = cellSlots.some((s) => s.isRoomConflict);
                return (
                  <CellPopover key={`${day.value}-${period}`} slot={slot} day={day.value} period={period}
                    classId={slot.classId} allSlots={slots} onAddSlot={onAddSlot} onDeleteSlot={onDeleteSlot}
                    readOnly={readOnly} subjects={subjects} assignments={assignments}>
                    <div className={`min-h-20 p-3 flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow rounded-sm border-l-[3px] ${
                      hasConflict || hasRoomConflict ? "bg-red-100 border-red-500" : "bg-white border-md-primary"
                    }`}>
                      <span className={`text-xs font-bold ${hasConflict || hasRoomConflict ? "text-red-700" : "text-md-on-surface"}`}>{subjectNames}</span>
                      <div>
                        <span className="text-[10px] text-md-primary font-medium">Lớp {classNames}</span>
                        {hasConflict && <p className="text-[10px] text-red-500 font-medium">⚠ Trùng lịch</p>}
                        {hasRoomConflict && <p className="text-[10px] text-red-500 font-medium">⚠ Trùng phòng</p>}
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
