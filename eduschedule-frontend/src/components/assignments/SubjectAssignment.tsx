"use client";

import { useState } from "react";
import {
  type SubjectTeacherAssignment,
  subjectColors,
  defaultSubjectColor,
} from "@/lib/assignment-data";
import { X, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { TypographyH4 } from "@/components/ui/typography";

interface Props {
  assignments: SubjectTeacherAssignment[];
  availableSubjects: string[];
  onRemoveSubject: (teacherId: number, subject: string) => void;
  onAddSubject: (teacherId: number, subject: string) => void;
}

export function SubjectAssignment({ assignments, availableSubjects, onRemoveSubject, onAddSubject }: Props) {
  return (
    <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-md-surface-container-low/30">
        <TypographyH4 title="Danh sách giáo viên bộ môn" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-md-surface-container-low/30">
            <TableRow>
              <TableHead className="px-4">Giáo viên</TableHead>
              <TableHead className="px-4">Mã GV</TableHead>
              <TableHead className="px-4">Môn học phụ trách</TableHead>
              <TableHead className="px-4 text-right">Số tiết/tuần</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((teacher) => (
              <TableRow key={teacher.teacherId}>
                <TableCell className="px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-md-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-md-primary" />
                    </div>
                    <span className="font-medium text-sm text-md-on-surface">{teacher.teacherName}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 font-mono text-xs font-semibold text-blue-700 uppercase">
                  {teacher.teacherCode}
                </TableCell>
                <TableCell className="px-4">
                  <SubjectTags
                    teacherId={teacher.teacherId}
                    subjects={teacher.assignedSubjects}
                    availableSubjects={availableSubjects}
                    onRemove={onRemoveSubject}
                    onAdd={onAddSubject}
                  />
                </TableCell>
                <TableCell className="px-4 text-right font-semibold text-sm text-md-on-surface">
                  {teacher.periodsPerWeek}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="px-6 py-3 bg-md-surface-container-low/10 border-t border-md-outline-variant/10">
        <p className="text-[11px] text-slate-400 font-medium">
          Đang hiển thị {assignments.length} giáo viên bộ môn
        </p>
      </div>
    </div>
  );
}

function SubjectTags({
  teacherId,
  subjects,
  availableSubjects,
  onRemove,
  onAdd,
}: {
  teacherId: number;
  subjects: string[];
  availableSubjects: string[];
  onRemove: (teacherId: number, subject: string) => void;
  onAdd: (teacherId: number, subject: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const unassigned = availableSubjects.filter((s) => !subjects.includes(s));

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {subjects.map((subject) => {
        const colors = subjectColors[subject] ?? defaultSubjectColor;
        return (
          <Badge
            key={subject}
            className={`${colors.bg} ${colors.text} border-transparent gap-1 pr-1`}
          >
            {subject}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(teacherId, subject)}
              className={`h-4 w-4 p-0 hover:bg-transparent ${colors.hover}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-6 w-6 rounded-md">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        {unassigned.length > 0 && (
          <PopoverContent align="start" className="w-44 p-1">
            {unassigned.map((subject, i) => (
              <>
                {i > 0 && <Separator key={`sep-${subject}`} />}
                <Button
                  key={subject}
                  variant="ghost"
                  className="w-full justify-start text-sm font-normal"
                  onClick={() => {
                    onAdd(teacherId, subject);
                    setOpen(false);
                  }}
                >
                  {subject}
                </Button>
              </>
            ))}
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
