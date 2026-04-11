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
  onSave: (data: Partial<SchoolClass> & { homeroomTeacherId?: number | null }) => void;
}

export function ClassModal({ open, onOpenChange, schoolClass, onSave }: ClassModalProps) {
  const [code, setCode] = useState("");
  const [grade, setGrade] = useState(1);
  const [name, setName] = useState("");
  const [studentCount, setStudentCount] = useState(30);
  const [homeroomTeacherId, setHomeroomTeacherId] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<TeacherResponse[]>([]);

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
    }
  }, [schoolClass, open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave({ code, grade, name, studentCount, homeroomTeacherId });
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

          {schoolClass && (
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
                  {teachers.filter((t) => t.type === "CHU_NHIEM").map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

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
