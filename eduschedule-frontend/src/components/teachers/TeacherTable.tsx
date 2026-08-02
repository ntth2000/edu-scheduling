"use client";

import { useEffect, useRef, useState } from "react";
import { type Teacher } from "@/lib/types";
import { TeacherModal } from "./TeacherModal";
import {
  Pencil,
  Download,
  UserX,
  UserPlus,
  FileUp,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

export function TeacherTable() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: number[]; names: string[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const openDeleteConfirm = (targets: Teacher[]) => {
    if (targets.length === 0) return;
    const scheduledNames = targets.filter((t) => t.scheduled).map((t) => t.name);
    if (scheduledNames.length > 0) {
      toast.error(
        `Giáo viên ${scheduledNames.join(", ")} đã được xếp trong thời khoá biểu nên không thể xoá.`
      );
      return;
    }
    setDeleteTarget({ ids: targets.map((t) => t.id), names: targets.map((t) => t.name) });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsBatchDeleting(true);
    try {
      const result = await teacherApi.deleteBatch(deleteTarget.ids);
      const deletedIds = new Set(deleteTarget.ids);
      setTeachers((prev) => prev.filter((t) => !deletedIds.has(t.id)));

      const parts: string[] = [`Đã xóa ${result.deletedTeachers} giáo viên`];
      if (result.deletedAssignments > 0) parts.push(`${result.deletedAssignments} phân công môn học`);
      if (result.deletedSlots > 0) parts.push(`${result.deletedSlots} tiết trong TKB`);
      if (result.unsetHomeroomClasses.length > 0) parts.push(`gỡ chủ nhiệm lớp ${result.unsetHomeroomClasses.join(", ")}`);
      toast.success(parts.join(", "));

      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể xóa giáo viên");
    } finally {
      setIsBatchDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredTeachers = teachers
    .filter((t) => {
      if (searchTerm.trim() && !t.name.toLowerCase().includes(searchTerm.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const { currentData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filteredTeachers, 20);

  // These must come AFTER usePagination so currentData is available
  const allOnPageSelected =
    currentData.length > 0 && currentData.every((t) => selectedIds.has(t.id));
  const someOnPageSelected =
    !allOnPageSelected && currentData.some((t) => selectedIds.has(t.id));

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
    const headers = ["Họ tên (*)", "Số tiết tối đa/tuần (*)", "Môn dạy (cách nhau bởi dấu phẩy)"];
    const sample = ["Nguyễn Văn A", "23", "Toán, Tiếng Việt"];
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
      const maxPeriodsPerWeek = parseInt(String(row[1] ?? "23"), 10) || 23;
      const subjectNames = String(row[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const subjectIds = subjectNames
        .map((name) => subjectList.find((s) => s.name === name)?.id)
        .filter((id): id is number => id !== undefined);

      try {
        const created = await teacherApi.create({ fullName, maxPeriodsPerWeek, subjectIds });
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

  const handleSave = async (data: Partial<Teacher>) => {
    const list = subjectList;

    const subjectIds = (data.subjects ?? [])
      .map((name: string) => list.find((s) => s.name === name)?.id)
      .filter((id: number | undefined): id is number => id !== undefined);

    const body = {
      fullName: data.name ?? "",
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
      <div className="bg-md-surface-container-lowest rounded-xl overflow-hidden shadow-md border border-slate-200">
        <div className="px-6 py-4 flex justify-between items-center bg-md-surface-container-low/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm theo tên giáo viên..."
                className="pl-8 h-9 w-64"
              />
            </div>
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold text-md-primary bg-md-primary/10 px-2 py-0.5 rounded-full">
                Đã chọn {selectedIds.size}/{filteredTeachers.length}
              </span>
            )}
          </div>
          <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openDeleteConfirm(teachers.filter((t) => selectedIds.has(t.id)))}
                disabled={isBatchDeleting || selectedIds.size === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xóa ({selectedIds.size})
              </Button>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Thêm mới
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
                  <Checkbox
                    checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="px-4">Mã GV</TableHead>
                <TableHead className="px-4">Họ tên</TableHead>
                <TableHead className="text-center px-4">Định mức tiết/tuần</TableHead>
                <TableHead className="text-right px-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((teacher) => {
                return (
                  <TableRow
                    key={teacher.id}
                    className={selectedIds.has(teacher.id) ? "bg-md-primary/5" : ""}
                  >
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selectedIds.has(teacher.id)}
                        onCheckedChange={() => toggleSelect(teacher.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-700 font-semibold px-4">
                      {teacher.code}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{teacher.name}</span>
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold text-slate-700">
                      {teacher.maxPeriods}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTeacher(teacher);
                          setIsModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-md-primary transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteConfirm([teacher])}
                        className="text-slate-400 hover:text-md-error transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
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
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.ids.length === 1
                ? `Xóa giáo viên ${deleteTarget.names[0]}?`
                : `Xóa ${deleteTarget?.ids.length ?? 0} giáo viên đã chọn?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Nếu giáo viên đã được phân công
              dạy học nhưng chưa xếp thời khoá biểu, các phân công đó sẽ bị xoá
              theo. Giáo viên đang là chủ nhiệm hoặc đã có tiết được xếp trong
              thời khoá biểu sẽ không thể xoá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isBatchDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Xóa
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
