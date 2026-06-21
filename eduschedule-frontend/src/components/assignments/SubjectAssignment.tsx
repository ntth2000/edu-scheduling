"use client";

import { useState, Fragment } from "react";
import {
  type SubjectResponse,
  type ClassResponse,
  type TeacherResponse,
  type AssignmentResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TypographyH4 } from "@/components/ui/typography";
import { Users, Check } from "lucide-react";

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

export function SubjectAssignment({ subjects, classes, teachers, assignments, onSave }: Props) {
  const grades = [1, 2, 3, 4, 5];
  const activeGrades = grades.filter((g) => classes.some((c) => c.grade === g));
  const classesByGrade: Record<number, ClassResponse[]> = {};
  activeGrades.forEach((g) => {
    classesByGrade[g] = classes
      .filter((c) => c.grade === g)
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  });

  const [viewMode, setViewMode] = useState<"matrix" | "teacher">("matrix");
  const savedMap = new Map<string, number | null>(
    assignments.map((a) => [`${a.classId}-${a.subjectId}`, a.teacherId])
  );

  const k = (classId: number, subjectId: number) => `${classId}-${subjectId}`;

  const getPeriodsForGrade = (sub: SubjectResponse, grade: number): number => {
    switch (grade) {
      case 1: return sub.periodsGrade1;
      case 2: return sub.periodsGrade2;
      case 3: return sub.periodsGrade3;
      case 4: return sub.periodsGrade4;
      case 5: return sub.periodsGrade5;
      default: return 0;
    }
  };

  // ── Matrix view helpers ──────────────────────────────
  const handleCellChange = async (classId: number, subjectId: number, value: string) => {
    const teacherId = value === "homeroom" ? null : Number(value);
    await onSave([{ classId, subjectId, teacherId }]);
  };

  // ── Teacher view helpers ─────────────────────────────
  const isAssigned = (classId: number, subjectId: number, teacherId: number): boolean =>
    savedMap.get(k(classId, subjectId)) === teacherId;

  const totalPeriodsForTeacher = (teacher: TeacherResponse): number => {
    if (teacher.type === "KHAC") return teacher.maxPeriodsPerWeek;
    let total = 0;
    assignments
      .filter((a) => a.teacherId === teacher.id)
      .forEach((a) => {
        const cls = classes.find((c) => c.id === a.classId);
        const sub = subjects.find((s) => s.id === a.subjectId);
        if (cls && sub) total += getPeriodsForGrade(sub, cls.grade);
      });
    return total;
  };

  const teacherGroups: { teacher: TeacherResponse; subjects: SubjectResponse[] }[] = [];
  teachers.forEach((t) => {
    const teachableSubjectIds = new Set(t.subjects.map((s) => s.id));
    const subs = subjects.filter((s) => teachableSubjectIds.has(s.id));
    if (subs.length > 0) teacherGroups.push({ teacher: t, subjects: subs });
  });

  return (
    <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-md-surface-container-low/30 flex items-center justify-between">
        <TypographyH4 title="Phân công giáo viên bộ môn" />
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "teacher" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode((v) => (v === "matrix" ? "teacher" : "matrix"))}
          >
            <Users className="h-3.5 w-3.5" />
            {viewMode === "teacher" ? "Hiển thị theo lớp" : "Hiển thị theo GVBM"}
          </Button>
        </div>
      </div>

      {/* ── Matrix view ────────────────────────────────── */}
      {viewMode === "matrix" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-md-surface-container-low/30 border-b border-md-outline-variant/20">
                <th className="sticky left-0 z-20 bg-md-surface-container-low/30 text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 text-left min-w-24 border-r border-md-outline-variant/20">
                  Lớp
                </th>
                {subjects.map((sub) => (
                  <th
                    key={sub.id}
                    className="text-xs font-semibold text-slate-600 px-2 py-3 text-center min-w-32 border-r border-md-outline-variant/10 last:border-r-0"
                  >
                    {sub.shortName || sub.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeGrades.map((grade) => (
                <Fragment key={grade}>
                  {/* Grade separator */}
                  <tr className="bg-slate-50 border-y border-md-outline-variant/15">
                    <td className="sticky left-0 z-10 bg-slate-50 px-4 py-1.5 border-r border-md-outline-variant/20">
                      <Badge variant="secondary" className="text-xs font-bold">Khối {grade}</Badge>
                    </td>
                    <td colSpan={subjects.length} className="bg-slate-50" />
                  </tr>
                  {(classesByGrade[grade] ?? []).map((cls) => (
                    <tr
                      key={cls.id}
                      className="group border-b border-md-outline-variant/10 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Sticky class name cell */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-4 py-2 border-r border-md-outline-variant/20 transition-colors">
                        <div className="text-sm font-medium text-md-on-surface">{cls.name}</div>
                        {cls.homeroomTeacherName && (
                          <div className="text-[10px] text-slate-400 leading-tight">{cls.homeroomTeacherName}</div>
                        )}
                      </td>
                      {subjects.map((sub) => {
                        const periods = getPeriodsForGrade(sub, grade);
                        const disabled = periods === 0;
                        const currentTeacherId = savedMap.get(k(cls.id, sub.id)) ?? null;
                        return (
                          <td
                            key={sub.id}
                            className="px-2 py-1.5 border-r border-md-outline-variant/10 last:border-r-0 text-center"
                          >
                            {disabled ? (
                              <div className="h-8 bg-slate-100 rounded flex items-center justify-center">
                                <span className="text-slate-300 text-xs select-none">—</span>
                              </div>
                            ) : (
                              <Select
                                value={currentTeacherId !== null ? String(currentTeacherId) : "homeroom"}
                                onValueChange={(val) => handleCellChange(cls.id, sub.id, val)}
                              >
                                <SelectTrigger
                                  className={`h-8 text-xs focus:ring-0 focus:ring-offset-0 ${
                                    currentTeacherId !== null
                                      ? "bg-blue-50 border-blue-200 text-blue-700 font-medium"
                                      : "border-slate-200 bg-white text-slate-500"
                                  }`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="homeroom">
                                    <span className="text-slate-500 italic">GVCN</span>
                                  </SelectItem>
                                  {teachers
                                    .filter((t) => t.subjects.some((s) => s.id === sub.id))
                                    .map((t) => (
                                      <SelectItem key={t.id} value={String(t.id)}>
                                        {t.fullName}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Teacher view ────────────────────────────────── */}
      {viewMode === "teacher" && (
        <Table>
          <TableHeader>
            <TableRow className="bg-md-surface-container-low/30 border-b border-md-outline-variant/20 hover:bg-md-surface-container-low/30">
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-44 border-r border-md-outline-variant/20" rowSpan={2}>
                Giáo viên
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-24 text-center border-r border-md-outline-variant/20" rowSpan={2}>
                Định mức
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-24 text-center border-r border-md-outline-variant/20" rowSpan={2}>
                Số tiết/tuần
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-36 border-r border-md-outline-variant/20" rowSpan={2}>
                Môn học
              </TableHead>
              {activeGrades.map((g) => (
                <TableHead
                  key={g}
                  colSpan={classesByGrade[g].length}
                  className="text-xs font-bold text-md-primary text-center border-r border-md-outline-variant/20 last:border-r-0"
                >
                  Khối {g}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="bg-md-surface-container-low/20 border-b border-md-outline-variant/20 hover:bg-md-surface-container-low/20">
              {activeGrades.map((g) =>
                classesByGrade[g].map((cls, i) => (
                  <TableHead
                    key={cls.id}
                    className={`text-xs font-medium text-center min-w-16 ${
                      i === classesByGrade[g].length - 1
                        ? "border-r border-md-outline-variant/20"
                        : "border-r border-md-outline-variant/10"
                    }`}
                  >
                    <div className="font-semibold text-md-on-surface">{cls.name}</div>
                    {cls.homeroomTeacherName ? (
                      <div className="text-[10px] text-slate-400 mt-0.5 font-normal">{cls.homeroomTeacherName}</div>
                    ) : (
                      <div className="text-[10px] text-red-500 mt-0.5 font-medium">Chưa có GVCN</div>
                    )}
                  </TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teacherGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4 + classes.length} className="text-center text-slate-400 italic py-8">
                  Chưa có giáo viên bộ môn nào được phân công môn học
                </TableCell>
              </TableRow>
            ) : (
              teacherGroups.map(({ teacher, subjects: teacherSubjects }) =>
                teacherSubjects.map((subject, si) => {
                  const isFirst = si === 0;
                  const isLastSubject = si === teacherSubjects.length - 1;
                  return (
                    <TableRow
                      key={`${teacher.id}-${subject.id}`}
                      className={isLastSubject ? "border-b border-md-outline-variant/20" : "border-b border-md-outline-variant/10"}
                    >
                      {isFirst && (
                        <TableCell rowSpan={teacherSubjects.length} className="border-r border-md-outline-variant/20 align-top">
                          <div className="font-medium text-md-on-surface">{teacher.fullName}</div>
                        </TableCell>
                      )}
                      {isFirst && (
                        <TableCell rowSpan={teacherSubjects.length} className="border-r border-md-outline-variant/20 align-middle text-center">
                          <span className="font-semibold text-slate-700 text-sm">{teacher.maxPeriodsPerWeek}</span>
                          <div className="text-[10px] text-slate-400 mt-0.5">tiết/tuần</div>
                        </TableCell>
                      )}
                      {isFirst && (
                        <TableCell rowSpan={teacherSubjects.length} className="border-r border-md-outline-variant/20 align-middle text-center">
                          <span className={`font-semibold text-sm ${
                            totalPeriodsForTeacher(teacher) > teacher.maxPeriodsPerWeek ? "text-red-500" : "text-md-primary"
                          }`}>
                            {totalPeriodsForTeacher(teacher)}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">tiết/tuần</div>
                        </TableCell>
                      )}
                      <TableCell className="border-r border-md-outline-variant/20">
                        <div className="font-medium text-sm text-md-on-surface">{subject.name}</div>
                      </TableCell>
                      {activeGrades.map((g) =>
                        classesByGrade[g].map((cls, i) => {
                          const assigned = isAssigned(cls.id, subject.id, teacher.id);
                          return (
                            <TableCell
                              key={cls.id}
                              className={`text-center p-0 ${
                                i === classesByGrade[g].length - 1
                                  ? "border-r border-md-outline-variant/20"
                                  : "border-r border-md-outline-variant/10"
                              }`}
                            >
                              <div className={`w-full h-full flex items-center justify-center min-h-10 ${
                                assigned ? "bg-emerald-50 text-emerald-600" : ""
                              }`}>
                                {assigned && <Check className="w-4 h-4" strokeWidth={2.5} />}
                              </div>
                            </TableCell>
                          );
                        })
                      )}
                    </TableRow>
                  );
                })
              )
            )}
          </TableBody>
        </Table>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-md-surface-container-low/10 border-t border-md-outline-variant/10 text-xs text-slate-400">
        {teacherGroups.length} giáo viên · {subjects.length} môn học · {classes.length} lớp
      </div>
    </div>
  );
}
