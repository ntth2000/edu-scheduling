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
import type { SchoolClass } from "@/lib/mock-data";
import { Save } from "lucide-react";

interface ClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass: SchoolClass | null;
  onSave: (data: Partial<SchoolClass>) => void;
}

export function ClassModal({ open, onOpenChange, schoolClass, onSave }: ClassModalProps) {
  const [code, setCode] = useState("");
  const [grade, setGrade] = useState(1);
  const [name, setName] = useState("");
  const [studentCount, setStudentCount] = useState(30);

  useEffect(() => {
    if (schoolClass) {
      setCode(schoolClass.code);
      setGrade(schoolClass.grade);
      setName(schoolClass.name);
      setStudentCount(schoolClass.studentCount);
    } else {
      setCode("");
      setGrade(1);
      setName("");
      setStudentCount(30);
    }
  }, [schoolClass, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ code, grade, name, studentCount });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {schoolClass ? "Chỉnh sửa lớp học" : "Thêm lớp học mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field>
            <FieldLabel>Mã lớp <span className="text-red-600">*</span></FieldLabel>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="Ví dụ: 4D_2024"
            />
          </Field>

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
            <FieldLabel>Số học sinh</FieldLabel>
            <div className="relative">
              <Input
                type="number"
                value={studentCount}
                onChange={(e) => setStudentCount(Number(e.target.value))}
                min={1}
                className="pr-16 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">HS</span>
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
