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
import { type Teacher } from "@/lib/types";

export interface TeacherFilter {
  names: string[];
  types: string[];
  subjects: string[];
  statuses: string[];
}

interface TeacherFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teachers: Teacher[];
  filter: TeacherFilter;
  onApply: (filter: TeacherFilter) => void;
}

export function TeacherFilterModal({ open, onOpenChange, teachers, filter, onApply }: TeacherFilterModalProps) {
  const [names, setNames] = useState<string[]>(filter.names);
  const [types, setTypes] = useState<string[]>(filter.types);
  const [subjects, setSubjects] = useState<string[]>(filter.subjects);
  const [statuses, setStatuses] = useState<string[]>(filter.statuses);

  const nameOptions = [...new Set(teachers.map((t) => t.name))].sort().map((n) => ({ label: n, value: n }));

  const typeOptions = [
    { label: "GVCN", value: "CHU_NHIEM" },
    { label: "Bộ môn", value: "BO_MON" },
    { label: "Khác", value: "KHAC" },
  ];

  const subjectOptions = [
    ...new Set(teachers.flatMap((t) => t.subjects)),
  ].sort().map((s) => ({ label: s, value: s }));

  const statusOptions = [
    { label: "Hoạt động", value: "active" },
    { label: "Vô hiệu hoá", value: "inactive" },
  ];

  const handleApply = () => {
    onApply({ names, types, subjects, statuses });
    onOpenChange(false);
  };

  const handleReset = () => {
    setNames([]);
    setTypes([]);
    setSubjects([]);
    setStatuses([]);
  };

  const isDirty = names.length > 0 || types.length > 0 || subjects.length > 0 || statuses.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">Lọc giáo viên</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field>
            <FieldLabel>Họ tên</FieldLabel>
            <MultiSelect options={nameOptions} selected={names} onChange={setNames} placeholder="Tất cả giáo viên" />
          </Field>

          <Field>
            <FieldLabel>Loại GV</FieldLabel>
            <MultiSelect options={typeOptions} selected={types} onChange={setTypes} placeholder="Tất cả loại" />
          </Field>

          <Field>
            <FieldLabel>Môn dạy</FieldLabel>
            <MultiSelect options={subjectOptions} selected={subjects} onChange={setSubjects} placeholder="Tất cả môn" />
          </Field>

          <Field>
            <FieldLabel>Trạng thái</FieldLabel>
            <MultiSelect options={statusOptions} selected={statuses} onChange={setStatuses} placeholder="Tất cả trạng thái" />
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
