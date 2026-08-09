"use client";

import { useEffect, useState } from "react";
import { type SchoolClass } from "@/lib/types";
import { ClassModal } from "./ClassModal";
import { Pencil, Trash2, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { classApi, schoolYearApi, mapClass } from "@/lib/api";
import { ClassFilterModal, type ClassFilter } from "./ClassFilterModal";

const EMPTY_FILTER: ClassFilter = { names: [], grades: [], homeroomTeachers: [] };
const GRADE_ROWS = [[1, 2, 3], [4, 5]];

export function ClassTable({ year }: { year: string | null }) {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [defaultGrade, setDefaultGrade] = useState<number | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filter, setFilter] = useState<ClassFilter>(EMPTY_FILTER);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [currentSchoolYearId, setCurrentSchoolYearId] = useState<number | null>(null);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleGrade = (gradeClasses: SchoolClass[]) => {
    const allSelected = gradeClasses.every((c) => selectedIds.has(c.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        gradeClasses.forEach((c) => next.delete(c.id));
      } else {
        gradeClasses.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchDeleting(true);
    try {
      await classApi.deleteBatch(Array.from(selectedIds));
      setClasses((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      toast.success(`Đã xóa ${selectedIds.size} lớp học`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Không thể xóa lớp học");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setCurrentSchoolYearId(null);
    const load = async () => {
      try {
        const [data, allYears] = await Promise.all([
          classApi.getAll(year),
          schoolYearApi.getAll(),
        ]);
        setClasses(data.map(mapClass).sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, "vi")));
        const fromClass = data.find((c) => c.schoolYearId != null)?.schoolYearId ?? null;
        if (fromClass) {
          setCurrentSchoolYearId(fromClass);
        } else if (year) {
          const match = allYears.find((y) => y.name === year);
          if (match) setCurrentSchoolYearId(match.id);
        }
      } catch {
        toast.error("Không thể tải danh sách lớp học");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year]);

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

  const handleSave = async (dataList: (Partial<SchoolClass> & { homeroomTeacherId?: number | null })[]) => {
    if (editingClass && dataList.length === 1) {
      const data = dataList[0];
      const body = {
        name: data.name ?? "",
        grade: data.grade ?? 1,
        homeroomTeacherId: data.homeroomTeacherId ?? null,
      };
      try {
        const updated = await classApi.update(editingClass.id, body);
        setClasses((prev) =>
          prev.map((c) => (c.id === editingClass.id ? mapClass(updated) : c))
        );
        toast.success("Đã cập nhật thông tin lớp học");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Không thể lưu lớp học");
      }
    } else {
      let successCount = 0;
      // Trùng tên đã bị ClassModal chặn từ trước; đây là lưới an toàn cho các lỗi còn lại
      // (mất mạng, năm học bị xoá ở tab khác...) nên giữ nguyên nguyên văn thông báo của backend.
      const failures: string[] = [];
      for (const data of dataList) {
        const body = {
          name: data.name ?? "",
          grade: data.grade ?? 1,
          homeroomTeacherId: data.homeroomTeacherId ?? null,
          schoolYearId: currentSchoolYearId,
        };
        try {
          const created = await classApi.create(body);
          setClasses((prev) =>
            [...prev, mapClass(created)].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, "vi"))
          );
          successCount++;
        } catch (e) {
          failures.push(e instanceof Error ? e.message : `Không thể tạo lớp ${body.name}`);
        }
      }
      if (successCount > 0) toast.success(`Đã thêm ${successCount} lớp học mới`);
      if (failures.length > 0) {
        toast.error(`${failures.length} lớp không thể tạo`, {
          description: [...new Set(failures)].join("\n"),
          duration: 6000,
        });
      }
    }
    setIsModalOpen(false);
    setEditingClass(null);
    setDefaultGrade(undefined);
  };

  const activeFilterCount =
    filter.names.length + filter.grades.length + filter.homeroomTeachers.length;

  const filteredClasses = classes.filter((c) => {
    if (filter.names.length > 0 && !filter.names.includes(c.name)) return false;
    if (filter.grades.length > 0 && !filter.grades.includes(String(c.grade))) return false;
    if (filter.homeroomTeachers.length > 0 && !filter.homeroomTeachers.includes(c.homeroomTeacher ?? "")) return false;
    return true;
  });

  const classesByGrade = filteredClasses.reduce((acc, cls) => {
    if (!acc[cls.grade]) acc[cls.grade] = [];
    acc[cls.grade].push(cls);
    return acc;
  }, {} as Record<number, SchoolClass[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        {/* <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0 || isBatchDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa {selectedIds.size > 0 && `(${selectedIds.size})`}
          </Button>
          <Button
            size="sm"
            variant={activeFilterCount > 0 ? "secondary" : "ghost"}
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="h-3.5 w-3.5" />
            Lọc
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div> */}

        {/* Grade card grid */}
        {GRADE_ROWS.map((rowGrades, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-3 gap-4">
            {rowGrades.map((grade) => {
              const gradeClasses = classesByGrade[grade] ?? [];
              const allSelected = gradeClasses.length > 0 && gradeClasses.every((c) => selectedIds.has(c.id));

              return (
                <div key={grade} className="bg-white rounded-xl border border-sidebar-border shadow-sm flex flex-col overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 py-3 flex items-center gap-2.5 border-b border-sidebar-border">
                    {/* {gradeClasses.length > 0 && (
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-slate-300 accent-md-primary cursor-pointer"
                        checked={allSelected}
                        onChange={() => toggleGrade(gradeClasses)}
                      />
                    )} */}
                    <span className="font-bold text-sm text-md-on-surface">Khối {grade}</span>
                    <span className="ml-auto text-xs text-slate-400 font-medium">{gradeClasses.length} lớp</span>
                  </div>

                  {/* Class rows */}
                  <div className="flex-1 divide-y divide-slate-50">
                    {gradeClasses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-8">Chưa có lớp nào</p>
                    ) : (
                      gradeClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className={`px-4 py-2 flex items-center gap-2 group transition-colors ${selectedIds.has(cls.id) ? "bg-md-primary/5" : "hover:bg-slate-50/60"}`}
                        >
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-md-primary cursor-pointer"
                            checked={selectedIds.has(cls.id)}
                            onChange={() => toggleSelect(cls.id)}
                          />
                          <span className="flex-1 text-sm font-medium text-md-on-surface">Lớp {cls.name}</span>
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-md-primary"
                              onClick={() => { setEditingClass(cls); setDefaultGrade(undefined); setIsModalOpen(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-md-error"
                              onClick={() => setClassToDelete(cls)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="border-t border-sidebar-border">
                    <button
                      onClick={() => { setEditingClass(null); setDefaultGrade(grade); setIsModalOpen(true); }}
                      className="w-full py-2.5 text-xs text-slate-400 hover:text-md-primary hover:bg-md-primary/5 transition-colors flex items-center justify-center gap-1.5 font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm vào Khối {grade}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <ClassModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) { setEditingClass(null); setDefaultGrade(undefined); }
        }}
        schoolClass={editingClass}
        defaultGrade={defaultGrade}
        existingClasses={classes}
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
