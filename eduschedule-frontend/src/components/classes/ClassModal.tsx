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
import { Save } from "lucide-react";

interface ClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass: SchoolClass | null;
  defaultGrade?: number;
  onSave: (data: (Partial<SchoolClass> & { homeroomTeacherId?: number | null })[]) => void;
}

const makeEmptyByGrade = (): Record<number, string> => ({ 1: "", 2: "", 3: "", 4: "", 5: "" });

const parseNames = (raw: string): string[] =>
  raw.split(",").map((s) => s.trim()).filter(Boolean);

export function ClassModal({ open, onOpenChange, schoolClass, defaultGrade, onSave }: ClassModalProps) {
  // Edit mode
  const [grade, setGrade] = useState(1);
  const [name, setName] = useState("");
  const [homeroomTeacherId, setHomeroomTeacherId] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);

  // Add mode: one comma-separated string per grade
  const [addGrade, setAddGrade] = useState(1);
  const [classesByGrade, setClassesByGrade] = useState<Record<number, string>>(makeEmptyByGrade());

  const isEditMode = !!schoolClass;

  useEffect(() => {
    if (open && schoolClass) {
      teacherApi.getAll().then(setTeachers).catch(() => {});
    }
  }, [open, schoolClass]);

  useEffect(() => {
    if (schoolClass) {
      setGrade(schoolClass.grade);
      setName(schoolClass.name);
      setHomeroomTeacherId(schoolClass.homeroomTeacherId ?? null);
    } else {
      setGrade(1);
      setName("");
      setHomeroomTeacherId(null);
      setAddGrade(defaultGrade ?? 1);
      setClassesByGrade(makeEmptyByGrade());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolClass, open]);

  const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave([{ grade, name, homeroomTeacherId }]);
  };

  const handleSubmitAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const all: (Partial<SchoolClass> & { homeroomTeacherId?: number | null })[] = [];
    [1, 2, 3, 4, 5].forEach((g) => {
      parseNames(classesByGrade[g] ?? "").forEach((n) => {
        all.push({ grade: g, name: n, homeroomTeacherId: null });
      });
    });
    if (all.length === 0) return;
    onSave(all);
  };

  // Summary across ALL grades
  const allValid = [1, 2, 3, 4, 5].flatMap((g) =>
    parseNames(classesByGrade[g] ?? "").map((n) => ({ grade: g, name: n }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {isEditMode ? "Chỉnh sửa lớp học" : "Thêm lớp học mới"}
          </DialogTitle>
          {!isEditMode && (
            <p className="text-sm text-slate-500 mt-0.5">
              Chọn khối, nhập tên các lớp cách nhau bởi dấu phẩy — có thể nhập ở nhiều khối trước khi lưu
            </p>
          )}
        </DialogHeader>

        {isEditMode ? (
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
                onValueChange={(val) => setHomeroomTeacherId(val === "none" ? null : Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn giáo viên chủ nhiệm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chưa phân công</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />Lưu
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleSubmitAdd} className="space-y-5">
            {/* Grade selector */}
            <Field>
              <FieldLabel>Khối <span className="text-red-600">*</span></FieldLabel>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((g) => {
                  const count = parseNames(classesByGrade[g] ?? "").length;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setAddGrade(g)}
                      className={`relative flex-1 py-2 rounded-lg text-sm font-bold border transition-all
                        ${addGrade === g
                          ? "bg-md-primary text-white border-md-primary shadow-sm"
                          : "bg-md-surface-container-low/40 text-slate-600 border-md-outline-variant/30 hover:border-md-primary/50"
                        }`}
                    >
                      {g}
                      {count > 0 && (
                        <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
                          ${addGrade === g ? "bg-white text-md-primary" : "bg-md-primary text-white"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1">Đang nhập lớp thuộc Khối {addGrade}</p>
            </Field>

            {/* Single comma-separated input */}
            <Field>
              <FieldLabel>
                Tên các lớp — Khối {addGrade} <span className="text-red-600">*</span>
              </FieldLabel>
              <Input
                value={classesByGrade[addGrade] ?? ""}
                onChange={(e) =>
                  setClassesByGrade((prev) => ({ ...prev, [addGrade]: e.target.value }))
                }
                placeholder={`Ví dụ: ${addGrade}A, ${addGrade}B, ${addGrade}C`}
              />
              <p className="text-xs text-slate-400 mt-1">Nhập tên lớp, cách nhau bởi dấu phẩy</p>
            </Field>

            {/* Summary */}
            {allValid.length > 0 && (
              <div className="rounded-lg bg-md-primary-fixed/20 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-md-primary uppercase tracking-wide">
                  Tổng cộng sẽ tạo {allValid.length} lớp:
                </p>
                {[1, 2, 3, 4, 5].map((g) => {
                  const names = parseNames(classesByGrade[g] ?? "");
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
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
