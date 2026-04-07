"use client";

import { useEffect, useState } from "react";
import { type SchoolClass } from "@/lib/mock-data";
import { ClassModal } from "./ClassModal";
import { Pencil, Trash2, Filter, Download, ListChecks, Users, CalendarDays, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function ClassTable() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);

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

  const handleSave = async (data: Partial<SchoolClass>) => {
    const body = {
      name: data.name ?? "",
      grade: data.grade ?? 1,
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

  const completedCount = classes.filter((c) => c.assignmentStatus === "complete").length;
  const incompleteCount = classes.filter((c) => c.assignmentStatus === "incomplete").length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        {/* Main Table */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between bg-md-surface-container-low/30">
              <TypographyH4 title="Danh sách lớp học hiện tại" />
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-md-primary transition-colors">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-md-primary transition-colors">
                  <Download className="h-4 w-4" />
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
                    <TableHead className="px-4">Trạng thái</TableHead>
                    <TableHead className="text-right px-4">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id} className="group">
                      <TableCell className="px-4 text-sm font-medium text-md-on-surface">
                        Lớp {cls.name}
                      </TableCell>
                      <TableCell className="px-4">
                        <Badge variant="secondary">Khối {cls.grade}</Badge>
                      </TableCell>
                      <TableCell className="px-4 text-sm text-slate-600">
                        {cls.homeroomTeacher ?? <span className="italic text-slate-400">Chưa phân công</span>}
                      </TableCell>
                      <TableCell className="px-4">
                        <Badge
                          className={
                            cls.assignmentStatus === "complete"
                              ? "bg-emerald-100 text-emerald-700 border-transparent"
                              : "bg-amber-100 text-amber-700 border-transparent"
                          }
                        >
                          {cls.assignmentStatus === "complete" ? "Hoàn tất" : "Chưa đủ"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingClass(cls);
                              setIsModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setClassToDelete(cls)}
                            className="text-md-error hover:text-md-error hover:bg-md-error-container/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-6 py-4 bg-md-surface-container-low/10 border-t border-slate-50 flex justify-between items-center">
              <p className="text-[11px] text-slate-400 font-medium">
                Đang hiển thị {classes.length} lớp học
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-md-surface-container-lowest rounded-xl shadow-lg shadow-slate-200/50 flex flex-col h-fit sticky top-24">
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-xl font-bold text-md-on-surface font-heading">Thêm lớp học mới</h3>
              <p className="text-sm text-slate-500 mt-1">
                Nhập thông tin chi tiết để tạo hồ sơ lớp học mới.
              </p>
            </div>
            <QuickAddClassForm onSave={handleSave} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Tổng số lớp" value={classes.length} borderColor="border-md-primary" iconBg="bg-md-primary/10 text-md-primary" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Đã có GVCN" value={String(completedCount).padStart(2, "0")} borderColor="border-emerald-500" iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Chưa có GVCN" value={String(incompleteCount).padStart(2, "0")} borderColor="border-amber-500" iconBg="bg-amber-50 text-amber-600" />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Hoàn tất TKB" value={String(completedCount).padStart(2, "0")} borderColor="border-blue-400" iconBg="bg-blue-50 text-blue-600" />
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

function QuickAddClassForm({ onSave }: { onSave: (data: Partial<SchoolClass>) => void }) {
  const [grade, setGrade] = useState(1);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ grade, name });
    setName("");
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <Field>
        <FieldLabel>Khối <span className="text-red-600">*</span></FieldLabel>
        <Select value={String(grade)} onValueChange={(val) => setGrade(Number(val))}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn khối" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((g) => (
              <SelectItem key={g} value={String(g)}>Khối {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Tên lớp <span className="text-red-600">*</span></FieldLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: 4D"
          required
        />
      </Field>

      <div className="pt-4 flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full font-bold">
          Lưu bản ghi
        </Button>
        <Button type="reset" variant="secondary" size="lg" className="w-full font-semibold">
          Hủy bỏ
        </Button>
      </div>
    </form>
  );
}
