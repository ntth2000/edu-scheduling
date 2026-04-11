"use client";

import { useState } from "react";
import {
  type SubjectResponse,
  type ClassResponse,
  type TeacherResponse,
  type AssignmentResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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
import { Save, Layers, LayoutGrid, Pencil, X, Check } from "lucide-react";

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

  const savedMap = new Map<string, number>(
    assignments.map((a) => [`${a.classId}-${a.subjectId}`, a.teacherId])
  );

  const [pending, setPending] = useState<Map<string, { checked: boolean; teacherId: number }>>(new Map());
  const [saving, setSaving] = useState(false);
  const [viewByGrade, setViewByGrade] = useState(false);
  const [editing, setEditing] = useState(false);

  const key = (classId: number, subjectId: number) => `${classId}-${subjectId}`;

  const isChecked = (classId: number, subjectId: number, teacherId: number): boolean => {
    const k = key(classId, subjectId);
    const p = pending.get(k);
    if (p !== undefined) return p.checked && p.teacherId === teacherId;
    return savedMap.get(k) === teacherId;
  };

  const gradeCheckState = (grade: number, subjectId: number, teacherId: number): boolean | "indeterminate" => {
    const gradeClasses = classesByGrade[grade] ?? [];
    const checkedCount = gradeClasses.filter((c) => isChecked(c.id, subjectId, teacherId)).length;
    if (checkedCount === 0) return false;
    if (checkedCount === gradeClasses.length) return true;
    return "indeterminate";
  };

  const isGradePending = (grade: number, subjectId: number): boolean =>
    (classesByGrade[grade] ?? []).some((c) => pending.has(key(c.id, subjectId)));

  const isDirty = pending.size > 0;

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

  const totalPeriodsForTeacher = (teacher: TeacherResponse): number => {
    if (teacher.type === "KHAC") return teacher.maxPeriodsPerWeek;
    const keys = new Set<string>();
    assignments.filter((a) => a.teacherId === teacher.id).forEach((a) => keys.add(`${a.classId}-${a.subjectId}`));
    pending.forEach(({ checked, teacherId }, k) => {
      if (checked && teacherId === teacher.id) keys.add(k);
      else if (savedMap.get(k) === teacher.id) keys.delete(k);
    });
    let total = 0;
    keys.forEach((k) => {
      const [cid, sid] = k.split("-").map(Number);
      const cls = classes.find((c) => c.id === cid);
      const sub = subjects.find((s) => s.id === sid);
      if (cls && sub) total += getPeriodsForGrade(sub, cls.grade);
    });
    return total;
  };

  const handleToggle = (classId: number, subjectId: number, teacherId: number) => {
    if (!editing) return;
    const k = key(classId, subjectId);
    const currentlyChecked = isChecked(classId, subjectId, teacherId);
    const savedTeacherId = savedMap.get(k);
    setPending((prev) => {
      const next = new Map(prev);
      if (!currentlyChecked && savedTeacherId === teacherId) { next.delete(k); return next; }
      if (currentlyChecked && savedTeacherId === undefined) { next.delete(k); return next; }
      next.set(k, { checked: !currentlyChecked, teacherId });
      return next;
    });
  };

  const handleGradeToggle = (grade: number, subjectId: number, teacherId: number) => {
    if (!editing) return;
    const state = gradeCheckState(grade, subjectId, teacherId);
    const newChecked = state !== true;
    (classesByGrade[grade] ?? []).forEach((cls) => {
      const k = key(cls.id, subjectId);
      const savedTeacherId = savedMap.get(k);
      setPending((prev) => {
        const next = new Map(prev);
        if (newChecked && savedTeacherId === teacherId) { next.delete(k); return next; }
        if (!newChecked && savedTeacherId === undefined) { next.delete(k); return next; }
        next.set(k, { checked: newChecked, teacherId });
        return next;
      });
    });
  };

  const handleSave = async () => {
    const changes: Change[] = [];
    pending.forEach(({ checked, teacherId }, k) => {
      const [classIdStr, subjectIdStr] = k.split("-");
      changes.push({
        classId: Number(classIdStr),
        subjectId: Number(subjectIdStr),
        teacherId: checked ? teacherId : null,
      });
    });
    setSaving(true);
    try {
      await onSave(changes);
      setPending(new Map());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setPending(new Map());
    setEditing(false);
  };

  const teacherGroups: { teacher: TeacherResponse; subjects: SubjectResponse[] }[] = [];
  teachers.forEach((t) => {
    const teachableSubjectIds = new Set(t.subjects.map((s) => s.id));
    const subs = subjects.filter((s) => teachableSubjectIds.has(s.id));
    if (subs.length > 0) teacherGroups.push({ teacher: t, subjects: subs });
  });

  const renderCell = (checked: boolean, isPending: boolean, onClick?: () => void) => {
    const baseClass = "w-full h-full flex items-center justify-center min-h-[32px]";
    if (editing) {
      return (
        <div
          onClick={onClick}
          className={`${baseClass} cursor-pointer rounded transition-all ${
            checked
              ? isPending
                ? "bg-amber-100 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
              : isPending
              ? "bg-red-50 text-red-400"
              : "hover:bg-slate-50"
          }`}
        >
          {checked && <Check className="w-4 h-4" strokeWidth={2.5} />}
          {!checked && isPending && <X className="w-3 h-3" />}
        </div>
      );
    }
    return (
      <div className={`${baseClass} ${checked ? "text-emerald-500" : ""}`}>
        {checked && <Check className="w-4 h-4" strokeWidth={2.5} />}
      </div>
    );
  };

  const renderGradeCell = (state: boolean | "indeterminate", isPending: boolean, onClick?: () => void) => {
    const baseClass = "w-full h-full flex items-center justify-center min-h-[32px]";
    const isOn = state === true || state === "indeterminate";
    if (editing) {
      return (
        <div
          onClick={onClick}
          className={`${baseClass} cursor-pointer rounded transition-all ${
            isOn
              ? isPending
                ? "bg-amber-100 text-amber-600"
                : "bg-emerald-50 text-emerald-600"
              : isPending
              ? "bg-red-50 text-red-400"
              : "hover:bg-slate-50"
          }`}
        >
          {state === true && <Check className="w-4 h-4" strokeWidth={2.5} />}
          {state === "indeterminate" && <div className="w-3 h-0.5 bg-current rounded" />}
          {state === false && isPending && <X className="w-3 h-3" />}
        </div>
      );
    }
    return (
      <div className={`${baseClass} ${isOn ? "text-emerald-500" : ""}`}>
        {state === true && <Check className="w-4 h-4" strokeWidth={2.5} />}
        {state === "indeterminate" && <div className="w-3 h-0.5 bg-emerald-400 rounded" />}
      </div>
    );
  };

  return (
    <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-md-surface-container-low/30 flex items-center justify-between">
        <TypographyH4 title="Phân công giáo viên bộ môn" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewByGrade((v) => !v)}
          >
            {viewByGrade ? (
              <><LayoutGrid className="h-3.5 w-3.5" />Hiển thị theo lớp</>
            ) : (
              <><Layers className="h-3.5 w-3.5" />Hiển thị theo khối</>
            )}
          </Button>
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleDiscard}>
                Huỷ
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!isDirty || saving}>
                <Save className="h-3.5 w-3.5" />
                {saving ? "Đang lưu..." : "Lưu phân công"}
                {isDirty && !saving && (
                  <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {pending.size}
                  </Badge>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Chỉnh sửa
            </Button>
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-md-surface-container-low/30 border-b border-md-outline-variant/20 hover:bg-md-surface-container-low/30">
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-44 border-r border-md-outline-variant/20" rowSpan={viewByGrade ? 1 : 2}>
              Giáo viên
            </TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-24 text-center border-r border-md-outline-variant/20" rowSpan={viewByGrade ? 1 : 2}>
              Định mức
            </TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-24 text-center border-r border-md-outline-variant/20" rowSpan={viewByGrade ? 1 : 2}>
              Số tiết/tuần
            </TableHead>
            <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-36 border-r border-md-outline-variant/20" rowSpan={viewByGrade ? 1 : 2}>
              Môn học
            </TableHead>
            {viewByGrade ? (
              activeGrades.map((g) => (
                <TableHead
                  key={g}
                  className="text-xs font-bold text-md-primary text-center border-r border-md-outline-variant/20 last:border-r-0 min-w-20"
                >
                  Khối {g}
                </TableHead>
              ))
            ) : (
              activeGrades.map((g) => (
                <TableHead
                  key={g}
                  colSpan={classesByGrade[g].length}
                  className="text-xs font-bold text-md-primary text-center border-r border-md-outline-variant/20 last:border-r-0"
                >
                  Khối {g}
                </TableHead>
              ))
            )}
          </TableRow>
          {!viewByGrade && (
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
                      <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                        {cls.homeroomTeacherName}
                      </div>
                    ) : (
                      <div className="text-[10px] text-red-500 mt-0.5 font-medium">
                        Chưa có GVCN
                      </div>
                    )}
                  </TableHead>
                ))
              )}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {teacherGroups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5 + (viewByGrade ? activeGrades.length : classes.length)}
                className="text-center text-slate-400 italic py-8"
              >
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
                      <TableCell
                        rowSpan={teacherSubjects.length}
                        className="border-r border-md-outline-variant/20 align-top"
                      >
                        <div className="font-medium text-md-on-surface">{teacher.fullName}</div>
                      </TableCell>
                    )}
                    {isFirst && (
                      <TableCell
                        rowSpan={teacherSubjects.length}
                        className="border-r border-md-outline-variant/20 align-middle text-center"
                      >
                        <span className="font-semibold text-slate-700 text-sm">
                          {teacher.maxPeriodsPerWeek}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">tiết/tuần</div>
                      </TableCell>
                    )}
                    {isFirst && (
                      <TableCell
                        rowSpan={teacherSubjects.length}
                        className="border-r border-md-outline-variant/20 align-middle text-center"
                      >
                        <span className={`font-semibold text-sm ${
                          totalPeriodsForTeacher(teacher) > teacher.maxPeriodsPerWeek
                            ? "text-red-500"
                            : "text-md-primary"
                        }`}>
                          {totalPeriodsForTeacher(teacher)}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">tiết/tuần</div>
                      </TableCell>
                    )}
                    <TableCell className="border-r border-md-outline-variant/20">
                      <div className="font-medium text-sm text-md-on-surface">{subject.name}</div>
                    </TableCell>

                    {viewByGrade ? (
                      activeGrades.map((g) => {
                        const state = gradeCheckState(g, subject.id, teacher.id);
                        const isPend = isGradePending(g, subject.id);
                        return (
                          <TableCell
                            key={g}
                            className="text-center border-r border-md-outline-variant/20 last:border-r-0"
                          >
                            {renderGradeCell(state, isPend, () => handleGradeToggle(g, subject.id, teacher.id))}
                          </TableCell>
                        );
                      })
                    ) : (
                      activeGrades.map((g) =>
                        classesByGrade[g].map((cls, i) => {
                          const checked = isChecked(cls.id, subject.id, teacher.id);
                          const isPend = pending.has(key(cls.id, subject.id));
                          return (
                            <TableCell
                              key={cls.id}
                              className={`text-center ${
                                i === classesByGrade[g].length - 1
                                  ? "border-r border-md-outline-variant/20"
                                  : "border-r border-md-outline-variant/10"
                              }`}
                            >
                              {renderCell(checked, isPend, () => handleToggle(cls.id, subject.id, teacher.id))}
                            </TableCell>
                          );
                        })
                      )
                    )}
                  </TableRow>
                );
              })
            )
          )}
        </TableBody>
      </Table>

      <div className="px-6 py-3 bg-md-surface-container-low/10 border-t border-md-outline-variant/10 text-xs text-slate-400">
        {teacherGroups.length} giáo viên · {subjects.length} môn học · {classes.length} lớp
        {isDirty && <span className="ml-2 text-amber-600 font-medium">· {pending.size} thay đổi chưa lưu</span>}
      </div>
    </div>
  );
}
