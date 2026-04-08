"use client";

import { useEffect, useState } from "react";
import { type Teacher } from "@/lib/mock-data";
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

export function TeacherTable() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teacherToToggle, setTeacherToToggle] = useState<Teacher | null>(null);
  const { currentData, currentPage, setCurrentPage, itemsPerPage } = usePagination(teachers);

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
      const updated = await teacherApi.toggleStatus(teacherToToggle.id);
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherToToggle.id ? mapTeacher(updated) : t))
      );
      toast.success(
        teacherToToggle.status === "active"
          ? `Đã vô hiệu hoá giáo viên ${teacherToToggle.name}`
          : `Đã kích hoạt giáo viên ${teacherToToggle.name}`
      );
    } catch {
      toast.error("Không thể thay đổi trạng thái giáo viên");
    }
    setTeacherToToggle(null);
  };

  const handleSave = async (data: Partial<Teacher>) => {
    const list = subjectList;

    const subjectIds = (data.subjects ?? [])
      .map((name) => list.find((s) => s.name === name)?.id)
      .filter((id): id is number => id !== undefined);

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
          <Button size="lg" variant="secondary">
            <FileUp className="w-5 h-5" />
            Nhập dữ liệu từ Excel
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
          <TypographyH4 title="Danh sách giáo viên" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Thêm mới
            </Button>
            <Button size="sm" variant="ghost">
              <Filter className="h-3.5 w-3.5" />
              Lọc
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
                  <TableRow key={teacher.id}>
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
          <p>Hiển thị {currentData.length} trong số {teachers.length} giáo viên</p>
          <div>
            <CustomPagination
              totalItems={teachers.length}
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
    </>
  );
}
