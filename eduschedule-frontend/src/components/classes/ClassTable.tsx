"use client";

import { useEffect, useState } from "react";
import { type SchoolClass } from "@/lib/types";
import { ClassModal } from "./ClassModal";
import { Pencil, Trash2, Filter, Download, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyH4 } from "../ui/typography";
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
import { classApi, mapClass } from "@/lib/api";
import { ClassFilterModal, type ClassFilter } from "./ClassFilterModal";
import { CustomPagination } from "../shared/CustomPagination";
import { usePagination } from "@/hooks/usePagination";

const EMPTY_FILTER: ClassFilter = { names: [], grades: [], homeroomTeachers: [] };

export function ClassTable() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState<ClassFilter>(EMPTY_FILTER);

  useEffect(() => {
    classApi.getAll()
      .then((data) => setClasses(data.map(mapClass)))
      .catch(() => toast.error("Không thể tải danh sách lớp học"))
      .finally(() => setLoading(false));
  }, []);

  const confirmDelete = async () => {
    if (!classToDelete) return;
    try {
      await classApi.delete(classToDelete.id);
      setClasses((prev) => prev.filter((c) => c.id !== classToDelete.id));
      toast.success(`Đã xóa Lớp ${classToDelete.name}`);
    } catch {
      toast.error("Không thể xóa lớp học");
    }
    setClassToDelete(null);
  };

  const handleSave = async (data: Partial<SchoolClass> & { homeroomTeacherId?: number | null }) => {
    const body = {
      name: data.name ?? "",
      grade: data.grade ?? 1,
      homeroomTeacherId: data.homeroomTeacherId ?? null,
    };
    try {
      if (editingClass) {
        const updated = await classApi.update(editingClass.id, body);
        setClasses((prev) =>
          prev.map((c) => (c.id === editingClass.id ? mapClass(updated) : c))
        );
        toast.success("Đã cập nhật thông tin lớp học");
      } else {
        const created = await classApi.create(body);
        setClasses((prev) => [...prev, mapClass(created)]);
        toast.success("Đã thêm lớp học mới");
      }
    } catch {
      toast.error("Không thể lưu lớp học");
    }
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const activeFilterCount =
    filter.names.length + filter.grades.length + filter.homeroomTeachers.length;

  const filteredClasses = classes.filter((c) => {
    if (filter.names.length > 0 && !filter.names.includes(c.name)) return false;
    if (filter.grades.length > 0 && !filter.grades.includes(String(c.grade))) return false;
    if (filter.homeroomTeachers.length > 0 && !filter.homeroomTeachers.includes(c.homeroomTeacher ?? "")) return false;
    return true;
  });

  const { currentData, currentPage, setCurrentPage, itemsPerPage } = usePagination(filteredClasses);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Tổng số lớp" value={classes.length} borderColor="border-md-primary" iconBg="bg-md-primary/10 text-md-primary" />
      </div>
      <div className="bg-md-surface-container-lowest rounded-xl overflow-hidden shadow-md">
        <div className="px-6 py-4 flex justify-between items-center bg-md-surface-container-low/30">
          <TypographyH4 title="Danh sách lớp học" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
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
                <TableHead className="px-4">Tên lớp</TableHead>
                <TableHead className="px-4">Khối</TableHead>
                <TableHead className="px-4">GVCN</TableHead>
                <TableHead className="text-right px-4">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="px-4 text-sm font-medium text-md-on-surface">
                    Lớp {cls.name}
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge variant="secondary">Khối {cls.grade}</Badge>
                  </TableCell>
                  <TableCell className="px-4 text-sm text-slate-600">
                    {cls.homeroomTeacher ?? <span className="italic text-slate-400">Chưa phân công</span>}
                  </TableCell>
                  <TableCell className="text-right px-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingClass(cls);
                        setIsModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-md-primary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setClassToDelete(cls)}
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
          <p>
            Hiển thị {currentData.length} trong số {filteredClasses.length} lớp học
            {activeFilterCount > 0 && <span className="ml-1 text-md-primary font-medium">(đang lọc)</span>}
          </p>
          <div>
            <CustomPagination
              totalItems={filteredClasses.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      <ClassModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingClass(null);
        }}
        schoolClass={editingClass}
        onSave={handleSave}
      />

      <ClassFilterModal
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        classes={classes}
        filter={filter}
        onApply={setFilter}
      />

      <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa Lớp {classToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ dữ liệu của lớp sẽ bị xóa vĩnh viễn.
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

function StatCard({
  icon,
  label,
  value,
  borderColor,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  borderColor: string;
  iconBg: string;
}) {
  return (
    <div className={`bg-md-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 ${borderColor} flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{label}</p>
        <h4 className="text-2xl font-extrabold text-md-on-surface font-heading">{value}</h4>
      </div>
    </div>
  );
}
