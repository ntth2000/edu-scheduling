"use client";

import { useEffect, useRef, useState } from "react";
import { type Subject } from "@/lib/types";
import { SubjectModal } from "./SubjectModal";
import { Pencil, Trash2, Download, Plus, FileUp } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyH4 } from "@/components/ui/typography";
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
import { subjectApi, mapSubject } from "@/lib/api";
import { CustomPagination } from "../shared/CustomPagination";
import { usePagination } from "@/hooks/usePagination";

export function SubjectTable() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const { currentData, currentPage, setCurrentPage, itemsPerPage } = usePagination(subjects);
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

  const allOnPageSelected =
    currentData.length > 0 && currentData.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentData.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentData.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchDeleting(true);
    try {
      await subjectApi.deleteBatch(Array.from(selectedIds));
      setSubjects((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      toast.success(`Đã xóa ${selectedIds.size} môn học`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Không thể xóa môn học");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ["Tên môn học (*)", "Viết tắt (*)", "Tiết/tuần Khối 1 (*)", "Tiết/tuần Khối 2 (*)", "Tiết/tuần Khối 3 (*)", "Tiết/tuần Khối 4 (*)", "Tiết/tuần Khối 5 (*)"];
    const sample = ["Toán", "Toán", 4, 5, 5, 5, 5];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    ws["!cols"] = headers.map((_, i) => ({ wch: i === 0 ? 30 : 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Môn học");
    XLSX.writeFile(wb, "mau_mon_hoc.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as (string | number)[][];
    const dataRows = rows.slice(1).filter((r) => r[0]);

    if (dataRows.length === 0) {
      toast.error("File không có dữ liệu");
      return;
    }

    // Validate all rows before importing anything
    const errors: string[] = [];
    const bodies = dataRows.map((row, i) => {
      const name = String(row[0] ?? "").trim();
      const shortName = String(row[1] ?? "").trim();
      if (!name) errors.push(`Dòng ${i + 2}: Tên môn học không được để trống`);
      if (!shortName) errors.push(`Dòng ${i + 2}: Viết tắt không được để trống`);
      return {
        name,
        shortName,
        periodsGrade1: parseInt(String(row[2] ?? "0"), 10) || 0,
        periodsGrade2: parseInt(String(row[3] ?? "0"), 10) || 0,
        periodsGrade3: parseInt(String(row[4] ?? "0"), 10) || 0,
        periodsGrade4: parseInt(String(row[5] ?? "0"), 10) || 0,
        periodsGrade5: parseInt(String(row[6] ?? "0"), 10) || 0,
      };
    });

    if (errors.length > 0) {
      toast.error(errors.join("\n"), { duration: 6000 });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    setImportProgress({ active: true, current: 0, total: bodies.length, successCount: 0, failCount: 0, done: false });

    for (let i = 0; i < bodies.length; i++) {
      try {
        const created = await subjectApi.create(bodies[i]);
        setSubjects((prev) => [...prev, mapSubject(created)]);
        successCount++;
      } catch {
        failCount++;
      }
      setImportProgress({
        active: true,
        current: i + 1,
        total: bodies.length,
        successCount,
        failCount,
        done: i + 1 === bodies.length,
      });
    }
  };

  useEffect(() => {
    subjectApi.getAll()
      .then((data) => setSubjects(data.map(mapSubject)))
      .catch(() => toast.error("Không thể tải danh sách môn học"))
      .finally(() => setLoading(false));
  }, []);

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    try {
      await subjectApi.delete(subjectToDelete.id);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id));
      toast.success(`Đã xóa môn học ${subjectToDelete.name}`);
    } catch {
      toast.error("Không thể xóa môn học");
    }
    setSubjectToDelete(null);
  };

  const handleSave = async (data: Partial<Subject>) => {
    const body = {
      name: data.name ?? "",
      shortName: data.shortName ?? "",
      periodsGrade1: data.periodsByGrade?.[0] ?? 0,
      periodsGrade2: data.periodsByGrade?.[1] ?? 0,
      periodsGrade3: data.periodsByGrade?.[2] ?? 0,
      periodsGrade4: data.periodsByGrade?.[3] ?? 0,
      periodsGrade5: data.periodsByGrade?.[4] ?? 0,
    };
    try {
      if (editingSubject) {
        const updated = await subjectApi.update(editingSubject.id, body);
        setSubjects((prev) =>
          prev.map((s) => (s.id === editingSubject.id ? mapSubject(updated) : s))
        );
        toast.success("Đã cập nhật môn học");
      } else {
        const created = await subjectApi.create(body);
        setSubjects((prev) => [...prev, mapSubject(created)]);
        toast.success("Đã thêm môn học mới");
      }
    } catch {
      toast.error("Không thể lưu môn học");
    }
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-md-surface-container-lowest rounded-xl overflow-hidden shadow-md">
        <div className="px-6 py-4 flex justify-between items-center bg-md-surface-container-low/30">
          <div className="flex items-center gap-3">
            <TypographyH4 title="Danh sách môn học" />
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
              <Plus className="h-3.5 w-3.5" />
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
                <TableHead className="w-10 px-4" rowSpan={2}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 accent-md-primary cursor-pointer"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="px-4" rowSpan={2}>Tên môn học</TableHead>
                <TableHead className="px-4 text-center" rowSpan={2}>Viết tắt</TableHead>
                <TableHead className="px-4 text-center border-b-0" colSpan={5}>Số tiết theo khối</TableHead>
                <TableHead className="text-right px-4" rowSpan={2}>Thao tác</TableHead>
              </TableRow>
              <TableRow>
                {[1, 2, 3, 4, 5].map((g) => (
                  <TableHead key={g} className="px-4 text-center text-xs">Khối {g}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((subject) => (
                <TableRow key={subject.id} className={selectedIds.has(subject.id) ? "bg-md-primary/5" : ""}>
                  <TableCell className="px-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 accent-md-primary cursor-pointer"
                      checked={selectedIds.has(subject.id)}
                      onChange={() => toggleSelect(subject.id)}
                    />
                  </TableCell>
                  <TableCell className="px-4 font-medium text-md-on-surface">
                    {subject.name}
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <Badge variant="secondary">{subject.shortName}</Badge>
                  </TableCell>
                  {subject.periodsByGrade.map((p: number, i: number) => (
                    <TableCell key={i} className="px-4 text-center text-sm font-semibold text-md-on-surface">
                      {p}
                    </TableCell>
                  ))}
                  <TableCell className="text-right px-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSubject(subject);
                        setIsModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-md-primary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSubjectToDelete(subject)}
                      className="text-slate-400 hover:text-md-error transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 bg-md-surface-container-low/30 border-t border-md-outline-variant/10 flex items-center justify-between text-xs text-slate-500">
          <p>Hiển thị {currentData.length} trong số {subjects.length} môn học</p>
          <div>
            <CustomPagination
              totalItems={subjects.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-md-primary-fixed/30 p-6 rounded-xl relative overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-md-primary/70 mb-1">
            Tổng số môn
          </p>
          <h4 className="text-3xl font-extrabold text-md-primary font-heading">
            {subjects.length}
          </h4>
        </div>
      </div>

      <SubjectModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingSubject(null);
        }}
        subject={editingSubject}
        onSave={handleSave}
      />

      <AlertDialog open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa môn học "{subjectToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Môn học sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
                      ? `Đã xử lý tất cả ${importProgress.total} môn học`
                      : `Đang xử lý ${importProgress.current} / ${importProgress.total} môn học`}
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
                    if (importProgress.successCount > 0) toast.success(`Đã nhập ${importProgress.successCount} môn học thành công`);
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
