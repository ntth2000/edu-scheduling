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

    try {
      const created = await Promise.all(bodies.map((body) => subjectApi.create(body)));
      setSubjects((prev) => [...prev, ...created.map(mapSubject)]);
      toast.success(`Đã nhập ${created.length} môn học thành công`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Nhập dữ liệu thất bại";
      toast.error(message);
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
          <TypographyH4 title="Danh sách môn học" />
          <div className="flex gap-2">
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
                <TableRow key={subject.id}>
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
    </>
  );
}
