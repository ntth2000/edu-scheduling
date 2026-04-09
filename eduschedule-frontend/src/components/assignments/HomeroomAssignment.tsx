"use client";

import { type HomeroomAssignment as HomeroomData } from "@/lib/assignment-data";
import { type TeacherResponse } from "@/lib/api";
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
import { TypographyH4 } from "@/components/ui/typography";
import { CustomPagination } from "@/components/shared/CustomPagination";
import { usePagination } from "@/hooks/usePagination";

interface Props {
  assignments: HomeroomData[];
  gvcnTeachers: TeacherResponse[];
  onAssign: (classId: number, teacherId: number | null) => void;
}

export function HomeroomAssignment({ assignments, gvcnTeachers, onAssign }: Props) {
  const grades = [1, 2, 3, 4, 5];
  const { currentData, currentPage, setCurrentPage, itemsPerPage } = usePagination(assignments);

  const currentGrades = [...new Set(currentData.map((a) => a.grade))].sort((a, b) => a - b);

  return (
    <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between bg-md-surface-container-low/30">
        <TypographyH4 title="Danh sách lớp học theo khối" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-md-surface-container-low/30">
            <TableRow>
              <TableHead className="px-4">Tên lớp</TableHead>
              <TableHead className="px-4 text-center">Khối</TableHead>
              <TableHead className="px-4">Giáo viên chủ nhiệm</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grades.filter((g) => currentGrades.includes(g)).map((grade) => {
              const gradeClasses = currentData.filter((a) => a.grade === grade);
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

      <div className="p-4 bg-md-surface-container-low/30 border-t border-md-outline-variant/10 flex items-center justify-between text-xs text-slate-500">
        <p>Hiển thị {currentData.length} trong số {assignments.length} lớp học</p>
        <CustomPagination
          totalItems={assignments.length}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
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
      <TableRow className="bg-md-surface-container-low/20 hover:bg-md-surface-container-low/20">
        <TableCell colSpan={3} className="px-4 py-2">
          <Badge variant="secondary" className="text-xs font-bold">
            Khối {grade}
          </Badge>
        </TableCell>
      </TableRow>

      {classes.map((cls) => (
        <TableRow key={cls.classId} className="group">
          <TableCell className="px-4 font-medium text-md-on-surface">
            Lớp {cls.className}
          </TableCell>
          <TableCell className="px-4 text-center">
            <Badge variant="secondary">{cls.grade}</Badge>
          </TableCell>
          <TableCell className="px-4">
            <Select
              value={cls.teacherId !== null ? String(cls.teacherId) : "none"}
              onValueChange={(val) => onAssign(cls.classId, val === "none" ? null : Number(val))}
            >
              <SelectTrigger className="max-w-64">
                <SelectValue placeholder="Chưa phân công" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="italic text-slate-400">Chưa phân công</span>
                </SelectItem>
                {gvcnTeachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
