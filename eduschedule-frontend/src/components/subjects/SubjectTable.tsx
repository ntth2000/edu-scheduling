"use client";

import { useEffect, useState } from "react";
import { type Subject } from "@/lib/mock-data";
import { SubjectModal } from "./SubjectModal";
import { Pencil, Trash2, Download, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
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
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left: Table */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden ring-1 ring-md-outline-variant/10">
            <div className="px-6 py-4 flex justify-between items-center bg-md-surface-container-low/30 border-b border-md-outline-variant/10">
              <TypographyH4 title="Danh sách môn học" />
              <Button variant="ghost" size="sm">
                <Download className="h-3.5 w-3.5" />
                Tải báo cáo
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-md-surface-container-low/20">
                  <TableRow>
                    <TableHead className="px-6">Tên môn học</TableHead>
                    <TableHead className="px-6 text-center">Viết tắt</TableHead>
                    <TableHead className="px-6 text-center">Giảng dạy bởi</TableHead>
                    <TableHead className="px-6 text-center">Số tiết theo khối</TableHead>
                    <TableHead className="px-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="px-6 font-semibold text-md-on-surface">
                        {subject.name}
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge variant="secondary">{subject.shortName}</Badge>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex justify-center gap-1">
                          {subject.periodsByGrade.map((p, i) => (
                            <div key={i} className="text-center">
                              <div className="text-[9px] text-slate-400 font-bold">K{i + 1}</div>
                              <div className="text-sm font-bold text-md-on-surface">{p}</div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-right">
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-md-primary-container p-6 rounded-xl text-white shadow-lg shadow-md-primary/20">
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-4">Tất cả</p>
              <p className="text-3xl font-extrabold font-heading">{subjects.length}</p>
              <p className="text-sm font-medium opacity-90">Tổng số môn học</p>
            </div>
          </div>
        </div>

        {/* Right: Add form */}
        <aside className="col-span-12 lg:col-span-4 sticky top-24">
          <div className="bg-md-surface-container-lowest p-6 rounded-2xl shadow-xl shadow-slate-200/50 ring-1 ring-md-outline-variant/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-md-primary">
                <PlusCircle className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-blue-900 text-lg font-heading">Thêm môn học mới</h3>
            </div>
            <QuickAddForm onSave={handleSave} />
          </div>
          <div className="mt-6 p-4 bg-md-primary-fixed/30 rounded-xl flex gap-3 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-md-primary-container shrink-0 mt-0.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
            <div>
              <p className="text-xs font-bold text-md-primary-container">Hướng dẫn</p>
              <p className="text-[11px] text-md-primary-container/80 leading-relaxed mt-1">
                Vui lòng nhập số tiết dự kiến cho từng khối lớp để hệ thống tự động tính toán tổng quỹ thời gian giảng dạy.
              </p>
            </div>
          </div>
        </aside>
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

function QuickAddForm({ onSave }: { onSave: (data: Partial<Subject>) => void }) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [periodsByGrade, setPeriodsByGrade] = useState<[number, number, number, number, number]>([0, 0, 0, 0, 0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, shortName, periodsByGrade });
    setName("");
    setShortName("");
    setPeriodsByGrade([0, 0, 0, 0, 0]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field>
        <FieldLabel>Tên môn học <span className="text-red-600">*</span></FieldLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Khoa học tự nhiên"
          required
        />
      </Field>

      <Field>
        <FieldLabel>Tên viết tắt <span className="text-red-600">*</span></FieldLabel>
        <Input
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          maxLength={6}
          placeholder="Ví dụ: KHTN"
          required
        />
      </Field>

      <Field>
        <FieldLabel>Số tiết trên tuần theo khối</FieldLabel>
        <div className="grid grid-cols-5 gap-2">
          {periodsByGrade.map((val, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold text-center">Khối {i + 1}</p>
              <Input
                type="number"
                min={0}
                max={15}
                value={val}
                onChange={(e) => {
                  const newPeriods = [...periodsByGrade] as [number, number, number, number, number];
                  newPeriods[i] = Number(e.target.value);
                  setPeriodsByGrade(newPeriods);
                }}
                className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none appearance-none"
              />
            </div>
          ))}
        </div>
      </Field>

      <div className="pt-4 space-y-3">
        <Button type="submit" size="lg" className="w-full font-bold">
          Lưu môn học
        </Button>
        <Button type="reset" variant="secondary" size="lg" className="w-full font-semibold">
          Hủy bỏ
        </Button>
      </div>
    </form>
  );
}
