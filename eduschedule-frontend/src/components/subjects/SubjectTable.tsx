"use client";

import { useEffect, useState } from "react";
import { type Subject } from "@/lib/mock-data";
import { SubjectModal } from "./SubjectModal";
import { Pencil, Trash2, Download, Plus } from "lucide-react";
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

export function SubjectTable() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

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
            <Button size="sm" variant="ghost">
              <Download className="h-3.5 w-3.5" />
              Xuất Excel
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-md-surface-container-low/30">
              <TableRow>
                <TableHead className="px-4">Tên môn học</TableHead>
                <TableHead className="px-4 text-center">Viết tắt</TableHead>
                <TableHead className="px-4 text-center">Số tiết theo khối</TableHead>
                <TableHead className="text-right px-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="px-4 font-medium text-md-on-surface">
                    {subject.name}
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <Badge variant="secondary">{subject.shortName}</Badge>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex justify-center gap-3">
                      {subject.periodsByGrade.map((p, i) => (
                        <div key={i} className="text-center">
                          <div className="text-[9px] text-slate-400 font-bold">K{i + 1}</div>
                          <div className="text-sm font-bold text-md-on-surface">{p}</div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
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
          <p>Hiển thị 1-{subjects.length} trong số {subjects.length} môn học</p>
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
