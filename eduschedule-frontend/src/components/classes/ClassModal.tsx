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
import { Save } from "lucide-react";
import { toast } from "sonner";

interface ClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass: SchoolClass | null;
  defaultGrade?: number;
  /** Các lớp đã có của năm học đang chọn — dùng để chặn trùng tên ngay tại form. */
  existingClasses: SchoolClass[];
  onSave: (data: (Partial<SchoolClass> & { homeroomTeacherId?: number | null })[]) => void;
}

const makeEmptyByGrade = (): Record<number, string> => ({ 1: "", 2: "", 3: "", 4: "", 5: "" });

const parseNames = (raw: string): string[] =>
  raw.split(",").map((s) => s.trim()).filter(Boolean);

// Backend ràng buộc UNIQUE(name, school_year_id) — trùng tên tính trên toàn năm học, không phân biệt
// khối. So sánh không phân biệt hoa/thường vì "1A" và "1a" với người dùng là cùng một lớp.
const normalizeName = (name: string): string => name.trim().toLowerCase();

export function ClassModal({
  open,
  onOpenChange,
  schoolClass,
  defaultGrade,
  existingClasses,
  onSave,
}: ClassModalProps) {
  // Edit mode
  const [grade, setGrade] = useState(1);
  const [name, setName] = useState("");

  // Add mode: one comma-separated string per grade
  const [addGrade, setAddGrade] = useState(1);
  const [classesByGrade, setClassesByGrade] = useState<Record<number, string>>(makeEmptyByGrade());

  const isEditMode = !!schoolClass;

  useEffect(() => {
    if (schoolClass) {
      setGrade(schoolClass.grade);
      setName(schoolClass.name);
    } else {
      setGrade(1);
      setName("");
      setAddGrade(defaultGrade ?? 1);
      setClassesByGrade(makeEmptyByGrade());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolClass, open]);

  // Summary across ALL grades
  const allValid = [1, 2, 3, 4, 5].flatMap((g) =>
    parseNames(classesByGrade[g] ?? "").map((n) => ({ grade: g, name: n }))
  );

  // Tên bị trùng: trùng với lớp đã có trong năm học, hoặc bị nhập lặp lại giữa các ô (kể cả khác
  // khối). Chỉ chạy lúc bấm nút lưu, không kiểm tra trong lúc người dùng đang gõ.
  const findDuplicates = (entries: { grade: number; name: string }[]) => {
    const taken = new Set(
      existingClasses.filter((c) => c.id !== schoolClass?.id).map((c) => normalizeName(c.name))
    );
    const found: { grade: number; name: string }[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      const key = normalizeName(entry.name);
      if ((taken.has(key) || seen.has(key)) && !found.some((d) => normalizeName(d.name) === key)) {
        found.push(entry);
      }
      seen.add(key);
    }
    return found;
  };

  const handleSubmitEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (findDuplicates([{ grade, name: trimmed }]).length > 0) {
      toast.error(`Lớp ${trimmed} đã tồn tại trong năm học này, không thể đặt trùng tên`);
      return;
    }
    // Popup sửa lớp không còn ô chọn GVCN — giữ nguyên GVCN hiện tại để lần lưu này không gỡ phân công.
    onSave([{ grade, name: trimmed, homeroomTeacherId: schoolClass?.homeroomTeacherId ?? null }]);
  };

  const handleSubmitAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (allValid.length === 0) return;

    const duplicates = findDuplicates(allValid);
    if (duplicates.length > 0) {
      toast.error(
        `Tên lớp bị trùng, không thể tạo: ${duplicates
          .map((d) => `${d.name} (khối ${d.grade})`)
          .join(", ")}`
      );
      return;
    }

    onSave(allValid.map(({ grade: g, name: n }) => ({ grade: g, name: n, homeroomTeacherId: null })));
  };

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
              <FieldLabel>Khối</FieldLabel>
              {/* Đổi khối của lớp đã tồn tại sẽ làm lệch phân công và số tiết theo khối, nên chỉ cho xem. */}
              <Select value={String(grade)} disabled>
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
