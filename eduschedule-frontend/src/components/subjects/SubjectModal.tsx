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
import { Save } from "lucide-react";
import { Subject } from "@/lib/types";

interface SubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onSave: (data: Partial<Subject>) => void;
}

export function SubjectModal({ open, onOpenChange, subject, onSave }: SubjectModalProps) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [periodsByGrade, setPeriodsByGrade] = useState<[number, number, number, number, number]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setShortName(subject.shortName);
      setPeriodsByGrade([...subject.periodsByGrade]);
    } else {
      setName("");
      setShortName("");
      setPeriodsByGrade([0, 0, 0, 0, 0]);
    }
  }, [subject, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, shortName, periodsByGrade });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {subject ? "Chỉnh sửa môn học" : "Thêm môn học mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field>
            <FieldLabel>Tên môn học <span className="text-red-600">*</span></FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field>
            <FieldLabel>Tên viết tắt <span className="text-red-600">*</span></FieldLabel>
            <Input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              required
            />
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
                    }}
                    className="text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none appearance-none"
                  />
                </div>
              ))}
            </div>
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
