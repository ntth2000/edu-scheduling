"use client";

import { useEffect, useState } from "react";
import {
  type AssignmentMode,
  type HomeroomAssignment,
} from "@/lib/assignment-data";
import { HomeroomAssignment as HomeroomAssignmentView } from "./HomeroomAssignment";
import { SubjectAssignment } from "./SubjectAssignment";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  teacherApi,
  subjectApi,
  classApi,
  assignmentApi,
  type TeacherResponse,
  type SubjectResponse,
  type ClassResponse,
  type AssignmentResponse,
} from "@/lib/api";

export function AssignmentPage() {
  const [mode, setMode] = useState<AssignmentMode>("homeroom");
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([teacherApi.getAll(), subjectApi.getAll(), classApi.getAll(), assignmentApi.getAll()])
      .then(([t, s, c, a]) => {
        setTeachers(t);
        setSubjects(s);
        setClasses(c);
        setAssignments(a);
      })
      .catch(() => toast.error("Không thể tải dữ liệu phân công"))
      .finally(() => setLoading(false));
  }, []);

  const homeroomData: HomeroomAssignment[] = classes
    .map((c) => ({
      classId: c.id,
      classCode: `${c.name}_2024`,
      className: c.name,
      grade: c.grade,
      teacherId: c.homeroomTeacherId ?? null,
    }))
    .sort((a, b) => a.grade - b.grade || a.className.localeCompare(b.className, "vi"));

  const gvcnTeachers = teachers.filter((t) => t.type === "CHU_NHIEM");

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

  const handleSubjectBatchSave = async (
    changes: { classId: number; subjectId: number; teacherId: number | null }[]
  ) => {
    let successCount = 0;
    let failCount = 0;
    const updatedAssignments = [...assignments];

    for (const { classId, subjectId, teacherId } of changes) {
      const existing = updatedAssignments.find(
        (a) => a.classId === classId && a.subjectId === subjectId
      );
      try {
        if (teacherId === null) {
          if (existing) {
            await assignmentApi.deleteAssignment(existing.id);
            const idx = updatedAssignments.findIndex((a) => a.id === existing.id);
            if (idx !== -1) updatedAssignments.splice(idx, 1);
          }
        } else {
          const result = await assignmentApi.assign(classId, subjectId, teacherId);
          if (existing) {
            const idx = updatedAssignments.findIndex((a) => a.id === existing.id);
            if (idx !== -1) updatedAssignments[idx] = result;
          } else {
            updatedAssignments.push(result);
          }
        }
        successCount++;
      } catch {
        failCount++;
      }
    }

    setAssignments([...updatedAssignments]);
    if (successCount > 0) toast.success(`Đã lưu ${successCount} phân công`);
    if (failCount > 0) toast.error(`${failCount} phân công thất bại`);
    if (failCount > 0) throw new Error("partial");
  };

  const boMonTeachers = teachers.filter((t) => t.type === "BO_MON" || t.type === "KHAC");

  return (
    <div className="space-y-6">
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <Tabs value={mode} onValueChange={(val) => setMode(val as AssignmentMode)}>
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Main Area */}
            <div className="col-span-12 lg:col-span-12 space-y-4">
              <TabsList>
                <TabsTrigger value="homeroom">Phân công Chủ nhiệm</TabsTrigger>
                <TabsTrigger value="subject">Phân công Bộ môn</TabsTrigger>
              </TabsList>

              <TabsContent value="homeroom">
                <HomeroomAssignmentView
                  assignments={homeroomData}
                  gvcnTeachers={gvcnTeachers}
                  onAssign={handleHomeroomAssign}
                />
              </TabsContent>
              <TabsContent value="subject">
                <SubjectAssignment
                  subjects={subjects}
                  classes={classes}
                  teachers={boMonTeachers}
                  assignments={assignments}
                  onSave={handleSubjectBatchSave}
                />
              </TabsContent>
            </div>

            {/* <div className="col-span-12 lg:col-span-3 space-y-4">
              <div className="bg-md-primary p-6 rounded-xl text-white shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-4">
                  Tình trạng phân công
                </p>
                <p className="text-3xl font-black mb-1">{assignedCount}/{totalCount}</p>
                <p className="text-[10px] text-white/60 font-bold uppercase mb-3">Lớp đã gán</p>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white/80 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <Separator className="my-4 bg-white/10" />
                <p className="text-xs text-white/60 leading-relaxed">
                  Tiến độ hoàn thành học kỳ I năm học 2024-2025
                </p>
              </div>

              <div className="bg-md-surface-container-lowest rounded-xl shadow-sm border border-md-outline-variant/20 p-6 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-md-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-md-primary" />
                </div>
                <div>
                  <TypographyH4 title="Tự động phân công?" />
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Sử dụng thuật toán thông minh để tối ưu hóa phân công dựa trên chuyên môn.
                  </p>
                </div>
                <Button variant="secondary" className="w-full text-xs">
                  Dùng thử ngay
                </Button>
              </div>

              <div className="bg-md-surface-container-lowest rounded-xl shadow-sm border border-md-outline-variant/20 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hướng dẫn</p>
                </div>
                <Separator className="mb-3" />
                <ul className="space-y-2 text-xs text-slate-500">
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
            </div> */}
          </div>
        </Tabs>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-9 space-y-4">
        <Skeleton className="h-9 w-72" />
        <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-md-surface-container-low/30">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-3 space-y-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    </div>
  );
}
