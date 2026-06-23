"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  timetableApi,
  weekApi,
  schoolYearApi,
  type TimetableResponse,
  type WeekResponse,
  type SchoolYearResponse,
} from "@/lib/api";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { CreateSchoolYearDialog } from "@/components/school-year/CreateSchoolYearDialog";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const result = new Date(y, m - 1, d + days);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
}

function isMonday(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr + "T00:00:00").getDay() === 1;
}

// ── Semester card ────────────────────────────────────────────────────────────

interface SemesterCardProps {
  semesterOrder: 1 | 2;
  timetable: TimetableResponse | null;
  weeks: WeekResponse[];
  saving: boolean;
  onApply: (timetableId: number, weekId: number, startDate: string, hasData: boolean) => void;
  onOpen: (timetableId: number) => void;
}

function SemesterCard({ semesterOrder, timetable, weeks, saving, onApply, onOpen }: SemesterCardProps) {
  const firstWeek = weeks[0] ?? null;
  const lastWeek = weeks[weeks.length - 1] ?? null;
  const storedStart = firstWeek?.startDate ?? "";

  const [localStart, setLocalStart] = useState(storedStart);
  const [dateError, setDateError] = useState("");

  // Sync when backend data refreshes
  useEffect(() => {
    setLocalStart(firstWeek?.startDate ?? "");
    setDateError("");
  }, [firstWeek?.startDate]);

  const totalWeeks = weeks.length;
  const previewEnd = localStart && totalWeeks > 0
    ? addDays(localStart, totalWeeks * 7 - 1)
    : (lastWeek?.endDate ?? "");

  const isDirty = localStart !== "" && localStart !== storedStart;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setLocalStart(storedStart);
      setDateError("");
      return;
    }
    if (!isMonday(val)) {
      setDateError("Vui lòng chọn ngày thứ Hai");
      return;
    }
    setDateError("");
    setLocalStart(val);
  };

  const handleApply = () => {
    if (!timetable || !firstWeek || !localStart || !isDirty) return;
    onApply(timetable.id, firstWeek.id, localStart, weeks.length > 0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 font-heading">
          Học kì {semesterOrder}
        </h3>
        {timetable && (
          <Button
            size="sm"
            onClick={() => onOpen(timetable.id)}
            className="text-xs"
          >
            Mở TKB
          </Button>
        )}
      </div>

      {/* Body */}
      {!timetable ? (
        <p className="text-sm text-slate-400 italic flex-1">Chưa có thời khoá biểu</p>
      ) : weeks.length === 0 ? (
        <p className="text-sm text-slate-400 italic flex-1">Chưa có dữ liệu tuần học</p>
      ) : (
        <div className="space-y-4 flex-1">
          {/* Start date */}
          <div>
            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ngày bắt đầu{" "}
              <span className="font-normal normal-case text-slate-400">(thứ Hai)</span>
            </Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                type="date"
                value={localStart}
                onChange={handleChange}
                className="max-w-40 text-sm"
              />
              {isDirty && (
                <Button size="sm" variant="outline" onClick={handleApply} disabled={saving}>
                  {saving ? "Đang lưu..." : "Cập nhật"}
                </Button>
              )}
            </div>
            {dateError && (
              <p className="text-xs text-red-500 mt-1">{dateError}</p>
            )}
          </div>

          {/* End date + total weeks */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Ngày kết thúc
              </p>
              <p className="text-sm font-medium text-slate-700 mt-1">
                {formatDate(previewEnd)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Tổng số tuần
              </p>
              <p className="text-sm font-medium text-slate-700 mt-1">{totalWeeks} tuần</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface TimetableListPageProps {
  yearParam?: string | null;
}

export function TimetableListPage({ yearParam }: TimetableListPageProps) {
  const router = useRouter();
  const [schoolYears, setSchoolYears] = useState<SchoolYearResponse[]>([]);
  const [timetables, setTimetables] = useState<TimetableResponse[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
  const [weeksMap, setWeeksMap] = useState<Record<number, WeekResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    timetableId: number;
    weekId: number;
    startDate: string;
  } | null>(null);

  const [createYearOpen, setCreateYearOpen] = useState(false);

  // Load school years on mount
  useEffect(() => {
    schoolYearApi
      .getAll()
      .then((years) => {
        setSchoolYears(years);
        const matched = yearParam ? years.find((y) => y.name === yearParam) : null;
        const year = matched ?? years[0] ?? null;
        if (year) setSelectedYearId(year.id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [yearParam]);

  // Load timetables + weeks when year changes
  useEffect(() => {
    if (!selectedYearId) return;
    setLoading(true);
    setWeeksMap({});
    timetableApi
      .getBySchoolYear(selectedYearId)
      .then(async (tms) => {
        setTimetables(tms);
        const entries = await Promise.all(
          tms.map(async (tm) => {
            const weeks = await weekApi.getByTimetable(tm.id);
            return [tm.id, weeks] as [number, WeekResponse[]];
          })
        );
        setWeeksMap(Object.fromEntries(entries));
      })
      .catch(() => toast.error("Không thể tải dữ liệu TKB"))
      .finally(() => setLoading(false));
  }, [selectedYearId]);

  const applyDateUpdate = async (timetableId: number, weekId: number, startDate: string) => {
    setSaving(true);
    try {
      await weekApi.updateStartDate(weekId, startDate);
      await weekApi.applyForward(weekId);
      // Reload weeks for this timetable
      const updated = await weekApi.getByTimetable(timetableId);
      setWeeksMap((prev) => ({ ...prev, [timetableId]: updated }));
      toast.success("Đã cập nhật ngày bắt đầu");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể cập nhật");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = (
    timetableId: number,
    weekId: number,
    startDate: string,
    hasData: boolean
  ) => {
    if (hasData) {
      setPendingUpdate({ timetableId, weekId, startDate });
      setConfirmOpen(true);
    } else {
      applyDateUpdate(timetableId, weekId, startDate);
    }
  };

  const handleConfirm = () => {
    if (!pendingUpdate) return;
    const { timetableId, weekId, startDate } = pendingUpdate;
    setConfirmOpen(false);
    setPendingUpdate(null);
    applyDateUpdate(timetableId, weekId, startDate);
  };

  const handleYearCreated = (year: SchoolYearResponse) => {
    setSchoolYears((prev) => [year, ...prev]);
    setSelectedYearId(year.id);
    toast.success(`Đã tạo năm học ${year.name}`);
  };

  const handleOpen = (timetableId: number) => {
    const year = schoolYears.find((y) => y.id === selectedYearId);
    router.push(`/timetable/${timetableId}${year ? `?year=${year.name}` : ""}`);
  };

  const selectedYear = schoolYears.find((y) => y.id === selectedYearId) ?? null;
  const hk1 = timetables.find((t) => t.semesterOrder === 1) ?? null;
  const hk2 = timetables.find((t) => t.semesterOrder === 2) ?? null;

  if (loading) {
    return <div className="p-8 text-slate-400 text-sm">Đang tải...</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-md-on-surface tracking-tight font-heading">
            Thời khoá biểu
          </h2>
          {selectedYear && (
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {selectedYear.name}
            </p>
          )}
        </div>
      </div>

      {/* Empty state */}
      {schoolYears.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <CalendarDays className="h-12 w-12 text-slate-300" />
          <div>
            <p className="text-slate-600 font-medium">Chưa có năm học nào</p>
            <p className="text-slate-400 text-sm mt-1">Tạo năm học để bắt đầu xếp thời khoá biểu</p>
          </div>
          <Button onClick={() => setCreateYearOpen(true)} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Tạo năm học
          </Button>
        </div>
      ) : (
        /* 2 fixed cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([1, 2] as const).map((sem) => {
            const tm = sem === 1 ? hk1 : hk2;
            const weeks = tm ? (weeksMap[tm.id] ?? []) : [];
            return (
              <SemesterCard
                key={sem}
                semesterOrder={sem}
                timetable={tm}
                weeks={weeks}
                saving={saving}
                onApply={handleApply}
                onOpen={handleOpen}
              />
            );
          })}
        </div>
      )}

      <CreateSchoolYearDialog
        open={createYearOpen}
        onOpenChange={setCreateYearOpen}
        onCreated={handleYearCreated}
      />

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!open) setPendingUpdate(null); setConfirmOpen(open); }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Thay đổi ngày bắt đầu?</AlertDialogTitle>
            <AlertDialogDescription>
              Thay đổi ngày bắt đầu sẽ tính lại ngày của tất cả các tuần. Dữ liệu tiết học không bị xoá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Xác nhận</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
