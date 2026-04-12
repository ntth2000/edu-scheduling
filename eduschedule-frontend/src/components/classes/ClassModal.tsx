"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SchoolClass } from "@/lib/types";
import { teacherApi, type TeacherResponse } from "@/lib/api";
import { Save, Plus, Trash2 } from "lucide-react";

interface ClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass: SchoolClass | null;
  onSave: (data: (Partial<SchoolClass> & { homeroomTeacherId?: number | null })[]) => void;
}

const makeEmptyByGrade = (): Record<number, string[]> => ({
  1: [""],
  2: [""],
  3: [""],
  4: [""],
  5: [""],
});

export function ClassModal({ open, onOpenChange, schoolClass, onSave }: ClassModalProps) {
  // Edit mode state
  const [code, setCode] = useState("");
  const [grade, setGrade] = useState(1);
  const [name, setName] = useState("");
  const [studentCount, setStudentCount] = useState(30);
  const [homeroomTeacherId, setHomeroomTeacherId] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);

  // Add mode: each grade keeps its own list of class names independently
  const [addGrade, setAddGrade] = useState(1);
  const [classesByGrade, setClassesByGrade] = useState<Record<number, string[]>>(makeEmptyByGrade());

  const isEditMode = !!schoolClass;

  // Derived: only the active grade's list is shown in the inputs
  const currentNames = classesByGrade[addGrade] ?? [""];

  useEffect(() => {
    if (open && schoolClass) {
      teacherApi.getAll().then(setTeachers).catch(() => {});
    }
  }, [open, schoolClass]);

  useEffect(() => {
    if (schoolClass) {
      setCode(schoolClass.code);
      setGrade(schoolClass.grade);
      setName(schoolClass.name);
      setStudentCount(schoolClass.studentCount);
      setHomeroomTeacherId(schoolClass.homeroomTeacherId ?? null);
    } else {
      setCode("");
      setGrade(1);
      setName("");
      setStudentCount(30);
      setHomeroomTeacherId(null);
      setAddGrade(1);
      setClassesByGrade(makeEmptyByGrade());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolClass, open]);

  const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave([{ code, grade, name, studentCount, homeroomTeacherId }]);
  };

  const handleSubmitAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Gather valid entries from ALL grades, not just the current one
    const all: (Partial<SchoolClass> & { homeroomTeacherId?: number | null })[] = [];
    [1, 2, 3, 4, 5].forEach((g) => {
      (classesByGrade[g] ?? []).forEach((n) => {
        const trimmed = n.trim();
        if (trimmed) {
          all.push({ grade: g, name: trimmed, studentCount: 30, homeroomTeacherId: null });
        }
      });
    });
    if (all.length === 0) return;
    onSave(all);
  };

  // Helpers — mutate only the selected grade's subarray
  const addNameInput = () =>
    setClassesByGrade((prev) => ({
      ...prev,
      [addGrade]: [...(prev[addGrade] ?? []), ""],
    }));

  const removeNameInput = (idx: number) =>
    setClassesByGrade((prev) => ({
      ...prev,
      [addGrade]: (prev[addGrade] ?? []).filter((_, i) => i !== idx),
    }));

  const updateName = (idx: number, value: string) =>
    setClassesByGrade((prev) => ({
      ...prev,
      [addGrade]: (prev[addGrade] ?? []).map((n, i) => (i === idx ? value : n)),
    }));

  // Summary across ALL grades for the preview panel
  const allValid = [1, 2, 3, 4, 5].flatMap((g) =>
    (classesByGrade[g] ?? [])
      .filter((n) => n.trim())
      .map((n) => ({ grade: g, name: n.trim() }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {isEditMode ? "Chỉnh sửa lớp học" : "Thêm lớp học mới"}
          </DialogTitle>
          {!isEditMode && (
            <p className="text-sm text-slate-500 mt-0.5">
              Chọn khối và nhập tên các lớp — có thể thêm ở nhiều khối trước khi lưu
            </p>
          )}
        </DialogHeader>

        {isEditMode ? (
          /* ─── EDIT MODE ─── */
          <form onSubmit={handleSubmitEdit} className="space-y-5">
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
                required
                placeholder="Ví dụ: 4D"
              />
            </Field>

            <Field>
              <FieldLabel>Giáo viên chủ nhiệm</FieldLabel>
              <Select
                value={homeroomTeacherId != null ? String(homeroomTeacherId) : "none"}
                onValueChange={(val) =>
                  setHomeroomTeacherId(val === "none" ? null : Number(val))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giáo viên chủ nhiệm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa phân công</SelectItem>
                  {teachers
                    .filter((t) => t.type === "CHU_NHIEM")
                    .map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* ─── ADD MODE: multi-grade, multi-class ─── */
          <form onSubmit={handleSubmitAdd} className="space-y-5">
            {/* Grade selector — badge shows queued count per grade */}
            <Field>
              <FieldLabel>Khối <span className="text-red-600">*</span></FieldLabel>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((g) => {
                  const count = (classesByGrade[g] ?? []).filter((n) => n.trim()).length;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setAddGrade(g)}
                      className={`relative flex-1 py-2 rounded-lg text-sm font-bold border transition-all
                        ${
                          addGrade === g
                            ? "bg-md-primary text-white border-md-primary shadow-sm"
                            : "bg-md-surface-container-low/40 text-slate-600 border-md-outline-variant/30 hover:border-md-primary/50"
                        }`}
                    >
                      {g}
                      {count > 0 && (
                        <span
                          className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
                            ${addGrade === g ? "bg-white text-md-primary" : "bg-md-primary text-white"}`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1">Đang nhập lớp thuộc Khối {addGrade}</p>
            </Field>

            {/* Input list — only shows the active grade's list; other grades are preserved in state */}
            <Field>
              <FieldLabel>
                Tên các lớp — Khối {addGrade} <span className="text-red-600">*</span>
              </FieldLabel>
              <div className="space-y-2">
                {currentNames.map((cn, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="w-7 h-7 rounded-full bg-md-primary-fixed/40 flex items-center justify-center flex-shrink-0 text-xs font-bold text-md-primary">
                      {idx + 1}
                    </div>
                    <Input
                      value={cn}
                      onChange={(e) => updateName(idx, e.target.value)}
                      placeholder={`Ví dụ: ${addGrade}${String.fromCharCode(65 + idx)}`}
                      className="flex-1"
                    />
                    {currentNames.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-500 flex-shrink-0"
                        onClick={() => removeNameInput(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full border-dashed"
                onClick={addNameInput}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Thêm lớp khác trong Khối {addGrade}
              </Button>
            </Field>

            {/* Summary — aggregates ALL grades, not just the current one */}
            {allValid.length > 0 && (
              <div className="rounded-lg bg-md-primary-fixed/20 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-md-primary uppercase tracking-wide">
                  Tổng cộng sẽ tạo {allValid.length} lớp:
                </p>
                {[1, 2, 3, 4, 5].map((g) => {
                  const names = (classesByGrade[g] ?? []).filter((n) => n.trim());
                  if (names.length === 0) return null;
                  return (
                    <p key={g} className="text-sm text-md-primary">
                      <span className="font-bold">Khối {g}:</span> {names.join(", ")}
                    </p>
                  );
                })}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={allValid.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                Tạo {allValid.length > 1 ? `${allValid.length} lớp` : "lớp"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
