"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { MultiSelect } from "@/components/ui/multi-select";
import { type SchoolClass } from "@/lib/mock-data";

export interface ClassFilter {
  names: string[];
  grades: string[];
  homeroomTeachers: string[];
}

interface ClassFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: SchoolClass[];
  filter: ClassFilter;
  onApply: (filter: ClassFilter) => void;
}

export function ClassFilterModal({ open, onOpenChange, classes, filter, onApply }: ClassFilterModalProps) {
  const [names, setNames] = useState<string[]>(filter.names);
  const [grades, setGrades] = useState<string[]>(filter.grades);
  const [homeroomTeachers, setHomeroomTeachers] = useState<string[]>(filter.homeroomTeachers);

  // Derive unique options from current data
  const nameOptions = [...new Set(classes.map((c) => c.name))].sort().map((n) => ({
    label: `Lớp ${n}`,
    value: n,
  }));

  const gradeOptions = [...new Set(classes.map((c) => String(c.grade)))].sort().map((g) => ({
    label: `Khối ${g}`,
    value: g,
  }));

  const teacherOptions = [
    ...new Set(classes.map((c) => c.homeroomTeacher).filter(Boolean) as string[]),
  ].sort().map((t) => ({ label: t, value: t }));

  const handleApply = () => {
    onApply({ names, grades, homeroomTeachers});
    onOpenChange(false);
  };

  const handleReset = () => {
    setNames([]);
    setGrades([]);
    setHomeroomTeachers([]);
  };

  const isDirty = names.length > 0 || grades.length > 0 || homeroomTeachers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">Lọc lớp học</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field>
            <FieldLabel>Tên lớp</FieldLabel>
            <MultiSelect
              options={nameOptions}
              selected={names}
              onChange={setNames}
              placeholder="Tất cả lớp"
            />
          </Field>

          <Field>
            <FieldLabel>Khối</FieldLabel>
            <MultiSelect
              options={gradeOptions}
              selected={grades}
              onChange={setGrades}
              placeholder="Tất cả khối"
            />
          </Field>

          <Field>
            <FieldLabel>Giáo viên chủ nhiệm</FieldLabel>
            <MultiSelect
              options={teacherOptions}
              selected={homeroomTeachers}
              onChange={setHomeroomTeachers}
              placeholder="Tất cả giáo viên"
            />
          </Field>
        </div>

        <DialogFooter className="gap-2">
          {isDirty && (
            <Button variant="ghost" onClick={handleReset} className="mr-auto">
              Xóa bộ lọc
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleApply}>Áp dụng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
