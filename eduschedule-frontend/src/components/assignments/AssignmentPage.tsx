"use client";

import { useEffect, useState } from "react";
import {
  type AssignmentMode,
  type HomeroomAssignment,
  type SubjectTeacherAssignment,
} from "@/lib/assignment-data";
import { HomeroomAssignment as HomeroomAssignmentView } from "./HomeroomAssignment";
import { SubjectAssignment } from "./SubjectAssignment";
import { Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  teacherApi,
  subjectApi,
  classApi,
  assignmentApi,
  type TeacherResponse,
  type SubjectResponse,
  type ClassResponse,
} from "@/lib/api";

export function AssignmentPage() {
  const [mode, setMode] = useState<AssignmentMode>("homeroom");
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([teacherApi.getAll(), subjectApi.getAll(), classApi.getAll()])
      .then(([t, s, c]) => {
        setTeachers(t);
        setSubjects(s);
        setClasses(c);
      })
      .catch(() => toast.error("Không thể tải dữ liệu phân công"))
      .finally(() => setLoading(false));
  }, []);

  // Derived data for child components
  const homeroomData: HomeroomAssignment[] = classes.map((c) => ({
    classId: c.id,
    classCode: `${c.name}_2024`,
    className: c.name,
    grade: c.grade,
    teacherId: c.homeroomTeacherId ?? null,
  }));

  const subjectData: SubjectTeacherAssignment[] = teachers
    .filter((t) => t.type === "BoMon")
    .map((t) => ({
      teacherId: t.id,
      teacherCode: `GV${String(t.id).padStart(3, "0")}`,
      teacherName: t.fullName,
      assignedSubjects: t.subjects.map((s) => s.name),
      periodsPerWeek: t.currentPeriodsPerWeek ?? 0,
    }));

  const gvcnTeachers = teachers.filter((t) => t.type === "GVCN");
  const boMonSubjects = subjects.map((s) => s.name);

  const handleHomeroomAssign = async (classId: number, teacherId: number | null) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    try {
      if (teacherId !== null) {
        await assignmentApi.assignHomeroom(classId, teacherId);
      } else {
        await classApi.update(classId, { name: cls.name, grade: cls.grade, homeroomTeacherId: null });
      }
      const assignedTeacher = teachers.find((t) => t.id === teacherId) ?? null;
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? { ...c, homeroomTeacherId: teacherId, homeroomTeacherName: assignedTeacher?.fullName ?? null }
            : c
        )
      );
      toast.success(`Đã cập nhật GVCN lớp ${cls.name}`);
    } catch {
      toast.error("Không thể cập nhật GVCN");
    }
  };

  const handleRemoveSubject = async (teacherId: number, subjectName: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;
    const updatedSubjectIds = teacher.subjects
      .filter((s) => s.name !== subjectName)
      .map((s) => s.id);
    try {
      const updated = await teacherApi.update(teacherId, {
        fullName: teacher.fullName,
        type: teacher.type,
        maxPeriodsPerWeek: teacher.maxPeriodsPerWeek,
        subjectIds: updatedSubjectIds,
      });
      setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updated : t)));
      toast.success(`Đã xóa môn ${subjectName}`);
    } catch {
      toast.error("Không thể cập nhật môn học");
    }
  };

  const handleAddSubject = async (teacherId: number, subjectName: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    const subject = subjects.find((s) => s.name === subjectName);
    if (!teacher || !subject) return;
    const updatedSubjectIds = [...teacher.subjects.map((s) => s.id), subject.id];
    try {
      const updated = await teacherApi.update(teacherId, {
        fullName: teacher.fullName,
        type: teacher.type,
        maxPeriodsPerWeek: teacher.maxPeriodsPerWeek,
        subjectIds: updatedSubjectIds,
      });
      setTeachers((prev) => prev.map((t) => (t.id === teacherId ? updated : t)));
      toast.success(`Đã thêm môn ${subjectName}`);
    } catch {
      toast.error("Không thể cập nhật môn học");
    }
  };

  const handleConfirm = () => {
    toast.success("Đã xác nhận phân công thành công!");
  };

  const assignedCount = homeroomData.filter((a) => a.teacherId !== null).length;
  const totalCount = homeroomData.length;

  return (
    <div className="p-8 space-y-8 flex-1">
      {/* Page Title + Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-md-on-surface tracking-tight font-heading">
            Phân công giảng dạy
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý và điều phối giáo viên chủ nhiệm & giáo viên bộ môn theo học kỳ.
          </p>
        </div>

        <div className="min-w-60">
          <Field>
            <FieldLabel>Chế độ phân công</FieldLabel>
            <Select value={mode} onValueChange={(val) => setMode(val as AssignmentMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homeroom">Phân công Chủ nhiệm</SelectItem>
                <SelectItem value="subject">Phân công Bộ môn</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Main Table Area */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {mode === "homeroom" ? (
              <HomeroomAssignmentView
                assignments={homeroomData}
                gvcnTeachers={gvcnTeachers}
                onAssign={handleHomeroomAssign}
              />
            ) : (
              <SubjectAssignment
                assignments={subjectData}
                availableSubjects={boMonSubjects}
                onRemoveSubject={handleRemoveSubject}
                onAddSubject={handleAddSubject}
              />
            )}

            {/* Footer Actions */}
            <div className="px-8 py-6 bg-md-surface-container-low/20 border-t border-md-outline-variant/10 flex justify-between items-center rounded-b-[2rem]">
              <p className="text-sm text-slate-500 font-medium italic">
                Tự động lưu sau khi thay đổi
              </p>
              <Button onClick={handleConfirm} size="lg">
                Xác nhận phân công
              </Button>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Stats Card */}
            <div className="bg-linear-to-br from-blue-700 to-blue-800 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mb-4">
                  Tình trạng Phân công
                </p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-3xl font-black">{assignedCount}/{totalCount}</p>
                      <p className="text-[10px] text-blue-200 font-bold uppercase">Lớp đã gán</p>
                    </div>
                    <div className="w-full h-1.5 bg-blue-900/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 transition-all"
                        style={{ width: `${totalCount > 0 ? (assignedCount / totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-blue-200 font-medium leading-relaxed">
                      Tiến độ hoàn thành học kỳ I năm học 2024-2025
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            </div>

            {/* AI Help Card */}
            <div className="p-6 rounded-[2rem] bg-white border border-md-outline-variant/20 shadow-sm flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-md-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                  Tự động Phân công?
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
                  Sử dụng thuật toán thông minh để tối ưu hóa phân công dựa trên chuyên môn.
                </p>
              </div>
              <Button variant="secondary" className="w-full text-xs">
                Dùng thử ngay
              </Button>
            </div>

            {/* Tips */}
            <div className="p-6 rounded-[2rem] border border-dashed border-md-outline-variant/40 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Hướng dẫn
                </p>
              </div>
              <ul className="space-y-3 text-xs text-slate-500 font-medium">
                <li className="flex gap-2">
                  <span className="text-md-primary">•</span>
                  Chọn giáo viên từ danh sách thả xuống trực tiếp trên bảng.
                </li>
                <li className="flex gap-2">
                  <span className="text-md-primary">•</span>
                  Nhấn xác nhận để áp dụng tất cả thay đổi cho hệ thống.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
