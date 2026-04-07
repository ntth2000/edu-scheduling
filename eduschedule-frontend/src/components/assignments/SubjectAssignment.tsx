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

interface Props {
  assignments: SubjectTeacherAssignment[];
  availableSubjects: string[];
  onRemoveSubject: (teacherId: number, subject: string) => void;
  onAddSubject: (teacherId: number, subject: string) => void;
}

export function SubjectAssignment({ assignments, availableSubjects, onRemoveSubject, onAddSubject }: Props) {
  return (
    <div className="bg-md-surface-container-lowest rounded-[2rem] shadow-sm border border-md-outline-variant/10 overflow-hidden">
      <div className="px-8 py-6 flex items-center justify-between bg-linear-to-r from-md-surface-container-low to-transparent">
        <h2 className="text-xl font-bold flex items-center gap-3 font-heading">
          <span className="w-2 h-6 bg-md-primary rounded-full" />
          Danh sách Giáo viên Bộ môn
        </h2>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-md-surface-container-low/30">
              <TableHead className="px-8">Giáo viên</TableHead>
              <TableHead className="px-8">Mã GV</TableHead>
              <TableHead className="px-8">Môn học phụ trách</TableHead>
              <TableHead className="px-8 text-right">Số tiết/tuần</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((teacher) => (
              <TableRow key={teacher.teacherId} className="group">
                <TableCell className="px-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-md-outline-variant/20 shadow-sm flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="font-bold text-slate-800">{teacher.teacherName}</div>
                  </div>
                </TableCell>
                <TableCell className="px-8 font-mono text-sm font-semibold text-slate-500 uppercase">
                  {teacher.teacherCode}
                </TableCell>
                <TableCell className="px-8">
                  <SubjectTags
                    teacherId={teacher.teacherId}
                    subjects={teacher.assignedSubjects}
                    availableSubjects={availableSubjects}
                    onRemove={onRemoveSubject}
                    onAdd={onAddSubject}
                  />
                </TableCell>
                <TableCell className="px-8 text-right font-bold text-slate-800">
                  {teacher.periodsPerWeek}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    <div className="flex flex-wrap gap-2">
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
              className={`h-4 w-4 p-0 ${colors.hover} hover:bg-transparent`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        );
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="icon" className="h-6 w-6 rounded-lg">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        {unassigned.length > 0 && (
          <PopoverContent align="start" className="w-44 p-1">
            {unassigned.map((subject) => (
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
            ))}
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
