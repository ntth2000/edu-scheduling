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
import { toast } from "sonner";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { type SubjectResponse } from "@/lib/api";
import { Teacher } from "@/lib/types";

const teacherSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ và tên"),
  maxPeriods: z.number().min(1, "Số tiết phải lớn hơn 0"),
});

interface TeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher | null;
  allSubjects: SubjectResponse[];
  onSave: (data: Partial<Teacher>) => Promise<void>;
}

export function TeacherModal({ open, onOpenChange, teacher, onSave }: TeacherModalProps) {
  const [name, setName] = useState("");
  const [maxPeriods, setMaxPeriods] = useState(23);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (teacher) {
      setName(teacher.name);
      setMaxPeriods(teacher.maxPeriods);
    } else {
      setName("");
      setMaxPeriods(23);
    }
    setErrors({});
    setLoading(false);
  }, [teacher, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    const result = teacherSchema.safeParse({ name, maxPeriods });
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (!newErrors[path]) {
          newErrors[path] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name,
        maxPeriods,
        subjects: teacher?.subjects ?? [],
      });
      toast.success(teacher ? "Đã cập nhật thông tin giáo viên" : "Đã thêm giáo viên mới");
    } catch (error) {
      toast.error("Không thể lưu thông tin giáo viên. Vui lòng thử lại.");
      console.error("Save teacher error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {teacher ? "Chỉnh sửa giáo viên" : "Thêm giáo viên mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Field>
            <FieldLabel>Họ và tên <span className="text-red-600">*</span></FieldLabel>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
              placeholder="Nhập tên giáo viên..."
              required
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <div className="flex items-center gap-2 text-destructive text-xs mt-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.name}</span>
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel>Số tiết tối đa/tuần <span className="text-red-600">*</span></FieldLabel>
            <div className="relative">
              <Input
                type="number"
                value={maxPeriods}
                onChange={(e) => {
                  setMaxPeriods(Number(e.target.value));
                  if (errors.maxPeriods) setErrors(prev => ({ ...prev, maxPeriods: "" }));
                }}
                min={1}
                max={40}
                aria-invalid={!!errors.maxPeriods}
                className="pr-12 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">TIẾT</span>
            </div>
            {errors.maxPeriods && (
              <div className="flex items-center gap-2 text-destructive text-xs mt-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.maxPeriods}</span>
              </div>
            )}
          </Field>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
