"use client";

import { useEffect, useRef, useState } from "react";
import { type Teacher } from "@/lib/types";
import { TeacherModal } from "./TeacherModal";
import {
  Pencil,
  Filter,
  Download,
  UserX,
  UserPlus,
  FileUp,
  UserMinus,
  UserCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyH3, TypographyH4, TypographyP } from "../ui/typography";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  teacherApi,
  subjectApi,
  mapTeacher,
  type SubjectResponse,
} from "@/lib/api";
import { CustomPagination } from "../shared/CustomPagination";
import { usePagination } from "@/hooks/usePagination";
import * as XLSX from "xlsx";
import { TeacherFilterModal, type TeacherFilter } from "./TeacherFilterModal";

export function TeacherTable() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teacherToToggle, setTeacherToToggle] = useState<Teacher | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState<TeacherFilter>({ names: [], types: [], subjects: [], statuses: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import progress state
  const [importProgress, setImportProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
    successCount: number;
    failCount: number;
    done: boolean;
  } | null>(null);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchDeleting(true);
    try {
      const result = await teacherApi.deleteBatch(Array.from(selectedIds));
      setTeachers((prev) => prev.filter((t) => !selectedIds.has(t.id)));

      const parts: string[] = [`Đã xóa ${result.deletedTeachers} giáo viên`];
      if (result.deletedAssignments > 0) parts.push(`${result.deletedAssignments} phân công môn học`);
      if (result.deletedSlots > 0) parts.push(`${result.deletedSlots} tiết trong TKB`);
      if (result.unsetHomeroomClasses.length > 0) parts.push(`gỡ chủ nhiệm lớp ${result.unsetHomeroomClasses.join(", ")}`);
      toast.success(parts.join(", "));

      setSelectedIds(new Set());
    } catch {
      toast.error("Không thể xóa giáo viên");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const activeFilterCount = filter.names.length + filter.types.length + filter.subjects.length + filter.statuses.length;

  const filteredTeachers = teachers.filter((t) => {
    if (filter.names.length > 0 && !filter.names.includes(t.name)) return false;
    if (filter.types.length > 0 && !filter.types.includes(t.type)) return false;
    if (filter.subjects.length > 0 && !filter.subjects.some((s) => t.subjects.includes(s))) return false;
    if (filter.statuses.length > 0 && !filter.statuses.includes(t.status)) return false;
    return true;
  });

  const { currentData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filteredTeachers);

  // These must come AFTER usePagination so currentData is available
  const allOnPageSelected =
    currentData.length > 0 && currentData.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentData.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentData.forEach((t) => next.add(t.id));
        return next;
      });
    }
  };

  const downloadTemplate = () => {
    const headers = ["Họ tên (*)", "Loại GV (*) [CHU_NHIEM/BO_MON/KHAC]", "Số tiết tối đa/tuần (*)", "Môn dạy (cách nhau bởi dấu phẩy)"];
    const sample = ["Nguyễn Văn A", "CHU_NHIEM", "23", "Toán, Tiếng Việt"];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    ws["!cols"] = headers.map(() => ({ wch: 32 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Giáo viên");
    XLSX.writeFile(wb, "mau_giao_vien.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
    const dataRows = rows.slice(1).filter((r) => r[0]);

    if (dataRows.length === 0) {
      toast.error("File không có dữ liệu");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    setImportProgress({ active: true, current: 0, total: dataRows.length, successCount: 0, failCount: 0, done: false });

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const fullName = String(row[0] ?? "").trim();
      const type = String(row[1] ?? "").trim() as "CHU_NHIEM" | "BO_MON" | "KHAC";
      const maxPeriodsPerWeek = parseInt(String(row[2] ?? "23"), 10) || 23;
      const subjectNames = String(row[3] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const subjectIds = subjectNames
        .map((name) => subjectList.find((s) => s.name === name)?.id)
        .filter((id): id is number => id !== undefined);

      try {
        const created = await teacherApi.create({ fullName, type, maxPeriodsPerWeek, subjectIds });
        setTeachers((prev) => [...prev, mapTeacher(created)]);
        successCount++;
      } catch {
        failCount++;
      }

      setImportProgress({
        active: true,
        current: i + 1,
        total: dataRows.length,
        successCount,
        failCount,
        done: i + 1 === dataRows.length,
      });
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      teacherApi.getAll(),
      subjectApi.getAll()
    ])
      .then(([t, s]) => {
        setTeachers(t.map(mapTeacher));
        setSubjectList(s);
      })
      .catch(() => toast.error("Không thể tải dữ liệu"))
      .finally(() => setLoading(false));
  }, []);

  const confirmToggleStatus = async () => {
    if (!teacherToToggle) return;
    try {
      const result = await teacherApi.toggleStatus(teacherToToggle.id);
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherToToggle.id ? mapTeacher(result.teacher) : t))
      );

      if (teacherToToggle.status === "active") {
        // Deactivated — show cascade info
        const parts: string[] = [`Đã vô hiệu hoá giáo viên ${teacherToToggle.name}`];
        if (result.deletedAssignments > 0) parts.push(`Đã xoá ${result.deletedAssignments} phân công môn học`);
        if (result.deletedSlots > 0) parts.push(`Đã xoá ${result.deletedSlots} tiết trong TKB`);
        if (result.unsetHomeroomClasses.length > 0) parts.push(`Đã gỡ chủ nhiệm lớp ${result.unsetHomeroomClasses.join(", ")}`);
        toast.success(parts.join(". "));
      } else {
        toast.success(`Đã kích hoạt giáo viên ${teacherToToggle.name}`);
      }
    } catch {
      toast.error("Không thể thay đổi trạng thái giáo viên");
    }
    setTeacherToToggle(null);
  };

  const handleSave = async (data: Partial<Teacher>) => {
    const list = subjectList;

    const subjectIds = (data.subjects ?? [])
      .map((name: string) => list.find((s) => s.name === name)?.id)
      .filter((id: number | undefined): id is number => id !== undefined);

    const body = {
      fullName: data.name ?? "",
      type: data.type ?? "CHU_NHIEM",
      maxPeriodsPerWeek: data.maxPeriods ?? 23,
      subjectIds,
    };

    try {
      if (editingTeacher?.id) {
        const updated = await teacherApi.update(editingTeacher.id, body);
        setTeachers((prev) =>
          prev.map((t) => (t.id === editingTeacher.id ? mapTeacher(updated) : t))
        );
      } else {
        const created = await teacherApi.create(body);
        setTeachers((prev) => [...prev, mapTeacher(created)]);
      }
      setIsModalOpen(false);
      setEditingTeacher(null);
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-md-surface-container-lowest rounded-2xl border-2 border-dashed border-md-outline-variant/30 p-12 text-center max-w-4xl mx-auto w-full my-auto">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <UserX className="w-12 h-12 text-blue-300" />
        </div>
        <TypographyH3 title="Chưa có thông tin giáo viên" />
        <TypographyP text="Hiện tại hệ thống chưa ghi nhận bất kỳ dữ liệu giáo viên nào. Vui lòng bắt đầu bằng cách thêm hồ sơ giáo viên mới." />
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <Button size="lg" onClick={() => setIsModalOpen(true)}>
            <UserPlus className="w-5 h-5" />
            Thêm giáo viên mới
          </Button>
          <Button size="lg" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="w-5 h-5" />
            Nhập dữ liệu từ Excel
          </Button>
          <Button size="lg" variant="outline" onClick={downloadTemplate}>
            <Download className="w-5 h-5" />
            Tải mẫu Excel
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />

        <TeacherModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setEditingTeacher(null);
          }}
          teacher={editingTeacher}
          allSubjects={subjectList}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-md-primary-fixed/30 p-6 rounded-xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-md-primary/70 mb-1">
              Tổng số GV
            </p>
            <h4 className="text-3xl font-extrabold text-md-primary font-heading">
              {teachers.length}
            </h4>
          </div>
        </div>
        <div className="bg-md-secondary-fixed/30 p-6 rounded-xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-md-secondary/70 mb-1">
              GV Chủ nhiệm
            </p>
            <h4 className="text-3xl font-extrabold text-md-secondary font-heading">
              {teachers.filter((t) => t.type === "CHU_NHIEM").length}
            </h4>
          </div>
        </div>
        <div className="bg-md-tertiary-fixed/30 p-6 rounded-xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-md-tertiary/70 mb-1">
              Ban Giám Hiệu / Khác
            </p>
            <h4 className="text-3xl font-extrabold text-md-tertiary font-heading">
              {teachers.filter((t) => t.type === "KHAC").length}
            </h4>
          </div>
        </div>
      </div>
      <div className="bg-md-surface-container-lowest rounded-xl overflow-hidden shadow-md">
        <div className="px-6 py-4 flex justify-between items-center bg-md-surface-container-low/30">
          <div className="flex items-center gap-3">
            <TypographyH4 title="Danh sách giáo viên" />
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold text-md-primary bg-md-primary/10 px-2 py-0.5 rounded-full">
                Đã chọn {selectedIds.size}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa ({selectedIds.size})
              </Button>
            )}
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Thêm mới
            </Button>
            <Button size="sm" variant={activeFilterCount > 0 ? "secondary" : "ghost"} onClick={() => setIsFilterOpen(true)}>
              <Filter className="h-3.5 w-3.5" />
              Lọc
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-3.5 w-3.5" />
              Nhập Excel
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />
              Tải mẫu
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-md-surface-container-low/30">
              <TableRow>
                <TableHead className="w-10 px-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-md-primary accent-md-primary cursor-pointer"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="px-4">Mã GV</TableHead>
                <TableHead className="px-4">Họ tên</TableHead>
                <TableHead className="px-4">Loại GV</TableHead>
                <TableHead className="px-4">Môn dạy</TableHead>
                <TableHead className="px-4">Trạng thái</TableHead>
                <TableHead className="text-center px-4">Tiết/Tuần</TableHead>
                <TableHead className="text-right px-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((teacher) => {
                const ratio = teacher.currentPeriods / teacher.maxPeriods;
                const periodColor =
                  ratio > 1
                    ? "text-md-error font-bold"
                    : ratio >= 0.8
                      ? "text-amber-600 font-bold"
                      : "text-emerald-600";

                return (
                  <TableRow
                    key={teacher.id}
                    className={selectedIds.has(teacher.id) ? "bg-md-primary/5" : ""}
                  >
                    <TableCell className="px-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-md-primary accent-md-primary cursor-pointer"
                        checked={selectedIds.has(teacher.id)}
                        onChange={() => toggleSelect(teacher.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-700 font-semibold px-4">
                      {teacher.code}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{teacher.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          teacher.type === "CHU_NHIEM"
                            ? "bg-blue-100 text-blue-700 border-transparent whitespace-nowrap"
                            : teacher.type === "BO_MON"
                              ? "bg-slate-100 text-slate-600 border-transparent whitespace-nowrap"
                              : "bg-purple-100 text-purple-700 border-transparent whitespace-nowrap"
                        }
                      >
                        {teacher.type === "CHU_NHIEM" ? "GVCN" : teacher.type === "BO_MON" ? "Bộ môn" : "Khác"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 italic">
                      {teacher.subjects.join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          teacher.status === "active"
                            ? "bg-emerald-100 text-emerald-700 border-transparent"
                            : "bg-slate-100 text-slate-600 border-transparent"
                        }
                      >
                        {teacher.status === "active" ? "Hoạt động" : "Vô hiệu hoá"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-center text-sm font-semibold ${periodColor}`}>
                      {teacher.currentPeriods}/{teacher.maxPeriods}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingTeacher(teacher);
                          setIsModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-md-primary transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTeacherToToggle(teacher)}
                        className={`transition-colors ${teacher.status === "active"
                          ? "text-slate-400 hover:text-amber-600"
                          : "text-slate-400 hover:text-emerald-600"
                          }`}
                        title={teacher.status === "active" ? "Vô hiệu hoá" : "Kích hoạt"}
                      >
                        {teacher.status === "active" ? (
                          <UserMinus className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 bg-md-surface-container-low/30 border-t border-md-outline-variant/10 flex items-center justify-between text-xs text-slate-500">
          <p>
            Hiển thị {currentData.length} trong số {filteredTeachers.length} giáo viên
            {activeFilterCount > 0 && <span className="ml-1 text-md-primary font-medium">(đang lọc)</span>}
          </p>
          <div>
            <CustomPagination
              totalItems={filteredTeachers.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      <TeacherFilterModal
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        teachers={teachers}
        filter={filter}
        onApply={setFilter}
      />

      <TeacherModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingTeacher(null);
        }}
        teacher={editingTeacher}
        allSubjects={subjectList}
        onSave={handleSave}
      />

      <AlertDialog
        open={!!teacherToToggle}
        onOpenChange={(open) => !open && setTeacherToToggle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {teacherToToggle?.status === "active"
                ? `Vô hiệu hóa giáo viên ${teacherToToggle?.name}?`
                : `Kích hoạt lại giáo viên ${teacherToToggle?.name}?`}
            </AlertDialogTitle>
            {teacherToToggle?.status === "active" && (
              <AlertDialogDescription>
                Giáo viên sẽ không xuất hiện trong danh sách phân công mới.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStatus}
              className={
                teacherToToggle?.status === "active"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {teacherToToggle?.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Import Progress Overlay */}
      {importProgress?.active && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-1">
                {importProgress.done ? (
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base text-slate-800 font-heading">
                    {importProgress.done ? "Nhập dữ liệu hoàn tất" : "Đang nhập dữ liệu..."}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {importProgress.done
                      ? `Đã xử lý tất cả ${importProgress.total} giáo viên`
                      : `Đang xử lý ${importProgress.current} / ${importProgress.total} giáo viên`}
                  </p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-6 pb-4">
              <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                    background: importProgress.done
                      ? "linear-gradient(90deg, #10b981, #059669)"
                      : "linear-gradient(90deg, #3b82f6, #6366f1)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-slate-400 font-medium">
                <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                <span>{importProgress.current}/{importProgress.total}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 pb-4 flex gap-3">
              <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-emerald-600 font-heading">{importProgress.successCount}</p>
                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Thành công</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold text-red-500 font-heading">{importProgress.failCount}</p>
                <p className="text-[11px] text-red-600 font-medium mt-0.5">Thất bại</p>
              </div>
            </div>

            {/* Footer */}
            {importProgress.done && (
              <div className="px-6 pb-6">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (importProgress.successCount > 0) toast.success(`Đã nhập ${importProgress.successCount} giáo viên thành công`);
                    if (importProgress.failCount > 0) toast.error(`${importProgress.failCount} dòng nhập thất bại`);
                    setImportProgress(null);
                  }}
                >
                  Xong
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
