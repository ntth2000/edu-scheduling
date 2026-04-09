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

  const activeFilterCount = filter.names.length + filter.types.length + filter.subjects.length + filter.statuses.length;

  const filteredTeachers = teachers.filter((t) => {
    if (filter.names.length > 0 && !filter.names.includes(t.name)) return false;
    if (filter.types.length > 0 && !filter.types.includes(t.type)) return false;
    if (filter.subjects.length > 0 && !filter.subjects.some((s) => t.subjects.includes(s))) return false;
    if (filter.statuses.length > 0 && !filter.statuses.includes(t.status)) return false;
    return true;
  });

  const { currentData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filteredTeachers);

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

    let successCount = 0;
    let failCount = 0;

    for (const row of dataRows) {
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
    }

    if (successCount > 0) toast.success(`Đã nhập ${successCount} giáo viên thành công`);
    if (failCount > 0) toast.error(`${failCount} dòng nhập thất bại`);
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
          <TypographyH4 title="Danh sách giáo viên" />
          <div className="flex gap-2">
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
    </>
  );
}
