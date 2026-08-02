"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type TeacherResponse,
  type SubjectResponse,
  type ClassResponse,
  type AssignmentResponse,
} from "@/lib/api";

interface Change {
  classId: number;
  subjectId: number;
  teacherId: number | null;
}

interface Props {
  open: boolean;
  defaultTeacher: TeacherResponse;
  subjects: SubjectResponse[];
  classes: ClassResponse[];
  assignments: AssignmentResponse[];
  onSave: (changes: Change[]) => Promise<void>;
  onClose: () => void;
}

function buildDraft(
  classes: ClassResponse[],
  subjects: SubjectResponse[],
  assignments: AssignmentResponse[],
  teacherId: number
): Map<string, boolean> {
  const draft = new Map<string, boolean>();
  for (const cls of classes) {
    for (const sub of subjects) {
      const a = assignments.find(
        (a) => a.classId === cls.id && a.subjectId === sub.id
      );
      draft.set(`${cls.id}-${sub.id}`, a?.teacherId === teacherId);
    }
  }
  return draft;
}

export function SubjectAssignmentModal({
  open,
  defaultTeacher,
  subjects,
  classes,
  assignments,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<Map<string, boolean>>(() =>
    buildDraft(classes, subjects, assignments, defaultTeacher.id)
  );
  const [saving, setSaving] = useState(false);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, "vi")),
    [classes]
  );

  const toggleCell = (classId: number, subjectId: number) => {
    const key = `${classId}-${subjectId}`;
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(key, !next.get(key));
      return next;
    });
  };

  const handleSave = async () => {
    const original = buildDraft(classes, subjects, assignments, defaultTeacher.id);
    const changes: Change[] = [];

    for (const cls of sortedClasses) {
      for (const sub of subjects) {
        const key = `${cls.id}-${sub.id}`;
        const was = original.get(key) ?? false;
        const now = draft.get(key) ?? false;
        if (now && !was) {
          changes.push({ classId: cls.id, subjectId: sub.id, teacherId: defaultTeacher.id });
        } else if (!now && was) {
          changes.push({ classId: cls.id, subjectId: sub.id, teacherId: null });
        }
      }
    }

    if (changes.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSave(changes);
      onClose();
    } catch {
      // handled by onSave (toast)
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] h-[90vh] flex flex-col gap-4 p-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-xl font-bold text-md-on-surface">
            Phân công chuyên môn chi tiết cho giáo viên {defaultTeacher.fullName}
          </DialogTitle>
        </DialogHeader>

        {/* Controls bar: save buttons right */}
        <div className="px-6 shrink-0 flex items-center justify-end gap-2 border-b border-md-outline-variant/20 pb-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu phân công"}
          </Button>
        </div>

        {/* Scrollable table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 border-b border-md-outline-variant/20">
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 py-2.5 text-center w-10 border-r border-md-outline-variant/20">
                  STT
                </th>
                <th className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-3 py-2.5 text-left min-w-20 border-r border-md-outline-variant/20">
                  Tên lớp
                </th>
                {subjects.map((sub) => (
                  <th
                    key={sub.id}
                    style={{ width: `${Math.floor(100 / subjects.length)}%` }}
                    className="text-xs font-semibold text-slate-600 px-2 py-2.5 text-center whitespace-normal wrap-break-word border-r border-md-outline-variant/10 last:border-r-0"
                  >
                    {sub.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedClasses.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + subjects.length}
                    className="text-center text-slate-400 italic py-8 text-xs"
                  >
                    Chưa có lớp nào
                  </td>
                </tr>
              ) : (
                sortedClasses.map((cls, idx) => (
                  <tr
                    key={cls.id}
                    className="border-b border-md-outline-variant/10 hover:bg-slate-50/60"
                  >
                    <td className="text-center text-xs text-slate-400 px-3 py-2.5 border-r border-md-outline-variant/20">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-sm border-r border-md-outline-variant/20">
                      {cls.name}
                    </td>
                    {subjects.map((sub) => {
                      const checked = draft.get(`${cls.id}-${sub.id}`) ?? false;
                      const periods = [
                        sub.periodsGrade1, sub.periodsGrade2, sub.periodsGrade3,
                        sub.periodsGrade4, sub.periodsGrade5,
                      ][cls.grade - 1] ?? 0;
                      const isHomeroomTeacher = defaultTeacher.homeroomClassName != null;
                      const isTheirClass = cls.homeroomTeacherId === defaultTeacher.id;
                      const disabled = periods === 0 || (isHomeroomTeacher && !isTheirClass);
                      const existingAssignment = assignments.find(
                        (a) => a.classId === cls.id && a.subjectId === sub.id
                      );
                      const displayPeriods = existingAssignment?.periodsPerWeek ?? periods;
                      return (
                        <td
                          key={sub.id}
                          className={`text-center px-2 py-2.5 border-r border-md-outline-variant/10 last:border-r-0 ${disabled ? "bg-slate-50" : ""}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={() => toggleCell(cls.id, sub.id)}
                              className="mx-auto"
                            />
                            {!disabled && (
                              <span className="text-[10px] text-slate-400 leading-none">
                                {displayPeriods} tiết
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
