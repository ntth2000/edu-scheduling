"use client";

import { useState, useMemo } from "react";
import {
  type SubjectResponse,
  type ClassResponse,
  type TeacherResponse,
  type AssignmentResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TypographyH4 } from "@/components/ui/typography";
import { usePagination } from "@/hooks/usePagination";
import { CustomPagination } from "@/components/shared/CustomPagination";
import { SubjectAssignmentModal } from "./SubjectAssignmentModal";
import { Pencil, Users, LayoutGrid, AlertTriangle } from "lucide-react";

interface Change {
  classId: number;
  subjectId: number;
  teacherId: number | null;
}

interface Props {
  subjects: SubjectResponse[];
  classes: ClassResponse[];
  teachers: TeacherResponse[];
  assignments: AssignmentResponse[];
  onSave: (changes: Change[]) => Promise<void>;
}

export function SubjectAssignment({
  subjects,
  classes,
  teachers,
  assignments,
  onSave,
}: Props) {
  const [editingTeacher, setEditingTeacher] = useState<TeacherResponse | null>(null);
  const [viewMode, setViewMode] = useState<"teacher" | "class">("teacher");
  const [selectedGrade, setSelectedGrade] = useState<number>(1);

  const { currentData, currentPage, setCurrentPage, itemsPerPage } =
    usePagination(teachers, 20);

  // ── Teacher view stats ──────────────────────────────────────────
  const teacherStats = useMemo(() => {
    const summaryMap = new Map<number, string>();
    const periodsMap = new Map<number, number>();
    for (const teacher of teachers) {
      const myAssignments = assignments.filter((a) => a.teacherId === teacher.id);
      const byClass = new Map<string, string[]>();
      let totalPeriods = 0;
      for (const a of myAssignments) {
        if (!byClass.has(a.className)) byClass.set(a.className, []);
        byClass.get(a.className)!.push(a.subjectName);
        totalPeriods += a.periodsPerWeek;
      }
      const parts = [...byClass.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "vi"))
        .map(([cls, subs]) => `${cls} (${subs.join(", ")})`);
      summaryMap.set(teacher.id, parts.join(", "));
      periodsMap.set(teacher.id, totalPeriods);
    }
    return { summaryMap, periodsMap };
  }, [teachers, assignments]);

  // ── Class view derived ──────────────────────────────────────────
  const grades = useMemo(
    () => [...new Set(classes.map((c) => c.grade))].sort(),
    [classes]
  );

  const gradeSubjects = useMemo(
    () =>
      subjects.filter((s) => {
        const p = [s.periodsGrade1, s.periodsGrade2, s.periodsGrade3, s.periodsGrade4, s.periodsGrade5];
        return (p[selectedGrade - 1] ?? 0) > 0;
      }),
    [subjects, selectedGrade]
  );

  const sortedTeachers = useMemo(
    () => [...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName, "vi")),
    [teachers]
  );

  const gradeClasses = useMemo(
    () =>
      classes
        .filter((c) => c.grade === selectedGrade)
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [classes, selectedGrade]
  );

  const completedCount = useMemo(
    () =>
      gradeClasses.filter((cls) =>
        gradeSubjects.every((sub) =>
          assignments.some((a) => a.classId === cls.id && a.subjectId === sub.id)
        )
      ).length,
    [gradeClasses, gradeSubjects, assignments]
  );

  // Badge: total unassigned across all classes/grades
  const unassignedCount = useMemo(() => {
    let count = 0;
    for (const cls of classes) {
      const subs = subjects.filter((s) => {
        const p = [s.periodsGrade1, s.periodsGrade2, s.periodsGrade3, s.periodsGrade4, s.periodsGrade5];
        return (p[cls.grade - 1] ?? 0) > 0;
      });
      for (const sub of subs) {
        if (!assignments.some((a) => a.classId === cls.id && a.subjectId === sub.id)) count++;
      }
    }
    return count;
  }, [classes, subjects, assignments]);

  return (
    <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-md-surface-container-low/30 flex items-center justify-between">
        <TypographyH4 title="Phân công chuyên môn" />
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("teacher")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "teacher"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Theo giáo viên
          </button>
          <button
            onClick={() => setViewMode("class")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              viewMode === "class"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Theo lớp
            {unassignedCount > 0 && (
              <span className="ml-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unassignedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── View: Theo giáo viên ── */}
      {viewMode === "teacher" && (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-md-surface-container-low/20 border-b border-md-outline-variant/20 hover:bg-md-surface-container-low/20">
                <TableHead className="w-12 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-md-outline-variant/20">
                  STT
                </TableHead>
                <TableHead className="w-12 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-md-outline-variant/20">
                  Phân công
                </TableHead>
                <TableHead className="w-56 text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-md-outline-variant/20">
                  Họ tên giáo viên
                </TableHead>
                <TableHead className="w-28 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-md-outline-variant/20">
                  Số tiết
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Môn dạy
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 italic py-8">
                    Chưa có giáo viên nào
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((teacher, idx) => {
                  const stt = (currentPage - 1) * itemsPerPage + idx + 1;
                  const summary = teacherStats.summaryMap.get(teacher.id);
                  const assigned = teacherStats.periodsMap.get(teacher.id) ?? 0;
                  const max = teacher.maxPeriodsPerWeek;
                  const overload = assigned > max;
                  return (
                    <TableRow key={teacher.id} className="border-b border-md-outline-variant/10 hover:bg-slate-50/60">
                      <TableCell className="text-center text-sm text-slate-500 border-r border-md-outline-variant/20">
                        {stt}
                      </TableCell>
                      <TableCell className="text-center border-r border-md-outline-variant/20">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 border-0 bg-transparent hover:bg-slate-100 hover:text-md-primary"
                          onClick={() => setEditingTeacher(teacher)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-sm border-r border-md-outline-variant/20">
                        {teacher.fullName}
                      </TableCell>
                      <TableCell className="text-center text-sm border-r border-md-outline-variant/20">
                        <span className={overload ? "text-red-500" : ""}>{assigned}</span>
                        <span className="text-slate-400"> / {max}</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 whitespace-normal wrap-break-word max-w-xs">
                        {summary ?? <span className="text-slate-400 italic text-xs">Chưa có phân công</span>}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {teachers.length > 0 && (
            <div className="px-6 py-3 border-t border-md-outline-variant/10 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400 shrink-0">
                {teachers.length} giáo viên · {classes.length} lớp
              </span>
              <CustomPagination
                totalItems={teachers.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* ── View: Theo lớp ── */}
      {viewMode === "class" && (
        <>
          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-md-outline-variant/10 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Khối:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              {grades.map((g) => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>
            <span className="ml-auto text-xs text-slate-500">
              Số lớp đã hoàn thành phân công:{" "}
              <span className="font-semibold text-slate-700">
                {completedCount}/{gradeClasses.length}
              </span>
            </span>
          </div>

          {/* Class cards */}
          <div className="divide-y divide-md-outline-variant/10">
            {gradeClasses.length === 0 ? (
              <div className="text-center text-slate-400 italic py-10 text-sm">
                Không có lớp nào trong khối {selectedGrade}
              </div>
            ) : (
              gradeClasses.map((cls) => {
                const clsUnassigned = gradeSubjects.filter(
                  (sub) => !assignments.some((a) => a.classId === cls.id && a.subjectId === sub.id)
                ).length;
                const teacherOptions = [
                  ...sortedTeachers.filter((t) => t.id === cls.homeroomTeacherId),
                  ...sortedTeachers.filter((t) => t.id !== cls.homeroomTeacherId),
                ];
                return (
                  <div key={cls.id} className="px-6 py-4">
                    {/* Class name row */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold text-slate-800 text-sm">
                        Lớp {cls.name}
                      </span>
                      {clsUnassigned > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          {clsUnassigned} môn chưa PC
                        </span>
                      )}
                    </div>

                    {/* Subject rows */}
                    <div className="space-y-1.5">
                      {gradeSubjects.map((sub) => {
                        const assignment = assignments.find(
                          (a) => a.classId === cls.id && a.subjectId === sub.id
                        );
                        return (
                          <div
                            key={sub.id}
                            className="flex items-center gap-4 py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-sm text-slate-700 w-56 shrink-0">{sub.name}</span>
                            <select
                              value={assignment?.teacherId ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                onSave([{
                                  classId: cls.id,
                                  subjectId: sub.id,
                                  teacherId: val === "" ? null : Number(val),
                                }]);
                              }}
                              className={`w-52 shrink-0 text-sm border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-md-primary/20 transition-colors ${
                                assignment
                                  ? "border-slate-200 bg-white text-slate-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              <option value="">— Chưa phân công —</option>
                              {teacherOptions.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.fullName}
                                  {t.id === cls.homeroomTeacherId
                                    ? " (GVCN)"
                                    : t.homeroomClassName
                                      ? ` (GVCN ${t.homeroomClassName})`
                                      : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Assignment modal */}
      {editingTeacher && (
        <SubjectAssignmentModal
          open
          defaultTeacher={editingTeacher}
          subjects={subjects}
          classes={classes}
          assignments={assignments}
          onSave={onSave}
          onClose={() => setEditingTeacher(null)}
        />
      )}
    </div>
  );
}
