"use client";

import { type HomeroomAssignment as HomeroomData } from "@/lib/assignment-data";
import { type TeacherResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil } from "lucide-react";

interface Props {
  assignments: HomeroomData[];
  gvcnTeachers: TeacherResponse[];
  onAssign: (classId: number, teacherId: number | null) => void;
}

export function HomeroomAssignment({ assignments, gvcnTeachers, onAssign }: Props) {
  const grades = [1, 2, 3, 4, 5];

  return (
    <div className="bg-md-surface-container-lowest rounded-[2rem] shadow-sm border border-md-outline-variant/10 overflow-hidden">
      <div className="px-8 py-6 flex items-center justify-between bg-linear-to-r from-md-surface-container-low to-transparent">
        <h2 className="text-xl font-bold flex items-center gap-3 font-heading">
          <span className="w-2 h-6 bg-md-primary rounded-full" />
          Danh sách Lớp học theo Khối
        </h2>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-md-outline-variant/20 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Năm học</span>
          <span className="text-sm font-bold text-md-primary">2024 - 2025</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-md-surface-container-low/30">
              <TableHead className="px-8">Tên lớp</TableHead>
              <TableHead className="px-8 text-center">Khối</TableHead>
              <TableHead className="px-8">Giáo viên Chủ nhiệm</TableHead>
              <TableHead className="px-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.map((grade) => {
              const gradeClasses = assignments.filter((a) => a.grade === grade);
              if (gradeClasses.length === 0) return null;
              return (
                <GradeGroup
                  key={grade}
                  grade={grade}
                  classes={gradeClasses}
                  gvcnTeachers={gvcnTeachers}
                  onAssign={onAssign}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GradeGroup({
  grade,
  classes,
  gvcnTeachers,
  onAssign,
}: {
  grade: number;
  classes: HomeroomData[];
  gvcnTeachers: TeacherResponse[];
  onAssign: (classId: number, teacherId: number | null) => void;
}) {
  return (
    <>
      <TableRow className="bg-blue-50/30 hover:bg-blue-50/30">
        <TableCell colSpan={4} className="px-8 py-3">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-tighter">
            Khối {grade}
          </span>
        </TableCell>
      </TableRow>

      {classes.map((cls) => (
        <TableRow key={cls.classId} className="group">
          <TableCell className="px-8 font-bold text-slate-800">
            Lớp {cls.className}
          </TableCell>
          <TableCell className="px-8 text-center">
            <Badge variant="secondary">{cls.grade}</Badge>
          </TableCell>
          <TableCell className="px-8">
            <Select
              value={cls.teacherId !== null ? String(cls.teacherId) : "none"}
              onValueChange={(val) =>
                onAssign(cls.classId, val === "none" ? null : Number(val))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chưa phân công" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa phân công</SelectItem>
                {gvcnTeachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
          <TableCell className="px-8 text-right">
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-md-primary transition-all"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
