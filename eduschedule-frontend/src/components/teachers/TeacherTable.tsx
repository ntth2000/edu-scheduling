"use client";

import { useEffect, useState } from "react";
import { type Teacher } from "@/lib/types";
import { TeacherModal } from "./TeacherModal";
import { Pencil, UserX, UserPlus, Trash2, Search } from "lucide-react";
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

export function TeacherTable() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: number[]; names: string[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    </>
  );
}
