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
import { Save, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Subject } from "@/lib/types";

const subjectSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên môn học"),
  periodsByGrade: z
    .array(z.number().min(0, "Số tiết phải >= 0").max(15, "Số tiết không quá 15"))
    .length(5),
});

interface SubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSave: (data: Partial<Subject>) => void;
}

export function SubjectModal({ open, onOpenChange, subject, onSave }: SubjectModalProps) {
  const [name, setName] = useState("");
  const [periodsByGrade, setPeriodsByGrade] = useState<[number, number, number, number, number]>([0, 0, 0, 0, 0]);
  const [nameError, setNameError] = useState("");
  const [periodErrors, setPeriodErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setPeriodsByGrade([...subject.periodsByGrade]);
    } else {
      setName("");
      setPeriodsByGrade([0, 0, 0, 0, 0]);
    }
    setNameError("");
    setPeriodErrors({});
  }, [subject, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = subjectSchema.safeParse({ name, periodsByGrade });
    if (!result.success) {
      let newNameError = "";
      const newPeriodErrors: Record<number, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0] === "name") {
          newNameError = issue.message;
        } else if (issue.path[0] === "periodsByGrade" && typeof issue.path[1] === "number") {
          const idx = issue.path[1];
          if (!newPeriodErrors[idx]) newPeriodErrors[idx] = issue.message;
        }
      });
      setNameError(newNameError);
      setPeriodErrors(newPeriodErrors);
      return;
    }

    setNameError("");
    setPeriodErrors({});
    onSave({ name, periodsByGrade });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {subject ? "Chỉnh sửa môn học" : "Thêm môn học mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Field>
            <FieldLabel>Tên môn học <span className="text-red-600">*</span></FieldLabel>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              aria-invalid={!!nameError}
            />
            {nameError && (
              <div className="flex items-center gap-2 text-destructive text-xs mt-1">
                <AlertCircle className="h-3 w-3" />
                <span>{nameError}</span>
              </div>
            )}
          </Field>

          <Field>
            <FieldLabel>Số tiết theo khối</FieldLabel>
            <div className="grid grid-cols-5 gap-2">
              {periodsByGrade.map((val, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold text-center">K{i + 1}</p>
                  <Input
                    type="number"
                    min={0}
                    max={15}
                    value={val}
                    onChange={(e) => {
                      const newP = [...periodsByGrade] as [number, number, number, number, number];
                      newP[i] = Number(e.target.value);
                      setPeriodsByGrade(newP);
                      if (periodErrors[i]) {
                        setPeriodErrors((prev) => {
                          const next = { ...prev };
                          delete next[i];
                          return next;
                        });
                      }
                    }}
                    aria-invalid={!!periodErrors[i]}
                    className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none appearance-none"
                  />
                </div>
              ))}
            </div>
            {Object.keys(periodErrors).length > 0 && (
              <div className="flex items-center gap-2 text-destructive text-xs mt-1">
                <AlertCircle className="h-3 w-3" />
                <span>{Object.values(periodErrors)[0]}</span>
              </div>
            )}
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
      </DialogContent>
    </Dialog>
  );
}
