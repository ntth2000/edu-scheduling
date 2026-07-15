"use client";

import { type HomeroomAssignment as HomeroomData } from "@/lib/assignment-data";
import { type TeacherResponse } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const GRADE_ROWS = [[1, 2, 3], [4, 5]];

interface Props {
  assignments: HomeroomData[];
  gvcnTeachers: TeacherResponse[];
  onAssign: (classId: number, teacherId: number | null) => void;
}

export function HomeroomAssignment({ assignments, gvcnTeachers, onAssign }: Props) {
  const assignedTeacherIds = new Set(
    assignments.filter((a) => a.teacherId !== null).map((a) => a.teacherId as number)
  );

  const assignmentsByGrade = assignments.reduce((acc, a) => {
    if (!acc[a.grade]) acc[a.grade] = [];
    acc[a.grade].push(a);
    return acc;
  }, {} as Record<number, HomeroomData[]>);

  return (
    <div className="space-y-4">
      {GRADE_ROWS.map((rowGrades, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-3 gap-4">
          {rowGrades.map((grade) => {
            const gradeClasses = (assignmentsByGrade[grade] ?? []).sort((a, b) =>
              a.className.localeCompare(b.className, "vi")
            );

            return (
              <div key={grade} className="bg-white rounded-xl border border-sidebar-border shadow-sm flex flex-col overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 flex items-center gap-2.5 border-b border-sidebar-border">
                  <span className="font-bold text-sm text-md-on-surface">Khối {grade}</span>
                  <span className="ml-auto text-xs text-slate-400 font-medium">{gradeClasses.length} lớp</span>
                </div>

                {/* Column labels */}
                {gradeClasses.length > 0 && (
                  <div className="px-4 py-2 border-b border-slate-50 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-16 shrink-0">Lớp</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Giáo viên chủ nhiệm</span>
                  </div>
                )}

                {/* Class rows */}
                <div className="flex-1 divide-y divide-slate-50">
                  {gradeClasses.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-8">Chưa có lớp nào</p>
                  ) : (
                    gradeClasses.map((cls) => {
                      const availableTeachers = gvcnTeachers.filter(
                        (t) => !assignedTeacherIds.has(t.id) || t.id === cls.teacherId
                      );
                      return (
                        <div key={cls.classId} className="px-4 py-2 flex items-center gap-2 hover:bg-slate-50/60 transition-colors">
                          <span className="text-sm font-medium text-md-on-surface w-16 shrink-0">
                            {cls.className}
                          </span>
                          <div className="flex-1 min-w-0">
                            <Select
                              value={cls.teacherId !== null ? String(cls.teacherId) : "none"}
                              onValueChange={(val) =>
                                onAssign(cls.classId, val === "none" ? null : Number(val))
                              }
                            >
                              <SelectTrigger className="h-8 w-full text-xs border-slate-200 bg-slate-50 focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Chưa phân công" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="italic text-slate-400">Chưa phân công</span>
                                </SelectItem>
                                {availableTeachers.map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {t.fullName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 shrink-0 text-xs px-2 ${cls.teacherId !== null ? "text-slate-400 hover:text-md-error hover:bg-md-error/10" : "invisible pointer-events-none"}`}
                            onClick={() => onAssign(cls.classId, null)}
                          >
                            Xoá GVCN
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
