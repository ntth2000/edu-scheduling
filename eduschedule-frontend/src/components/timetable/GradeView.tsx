"use client";

import { type Slot, DAYS, PERIODS } from "@/lib/timetable-data";
import type { AssignmentResponse, ClassResponse } from "@/lib/api";
import type { Subject } from "@/lib/types";
import { CellPopover } from "./CellPopover";

type AddSlotParams = {
  assignmentId?: number;
  classNumericId?: number;
  subjectNumericId?: number;
  day: number;
  period: number;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  subjectId: string;
  classId: string;
};

interface GradeViewProps {
  grade: number;
  slots: Slot[];
  classes: ClassResponse[];
  subjects: Subject[];
  assignments: AssignmentResponse[];
  readOnly?: boolean;
  onSelectClass: (className: string) => void;
  onAddSlot: (params: AddSlotParams) => void;
  onDeleteSlot: (slotId: string) => void;
}

export function GradeView({
  grade,
  slots,
  classes,
  subjects,
  assignments,
  readOnly = false,
  onSelectClass,
  onAddSlot,
  onDeleteSlot,
}: GradeViewProps) {
  const gradeClasses = classes
    .filter((c) => c.grade === grade)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const gradeSubjects = subjects.filter((s) => s.periodsByGrade[grade - 1] > 0);

  const getSlot = (className: string, day: number, period: number) =>
    slots.find((s) => s.classId === className && s.day === day && s.period === period);

  if (gradeClasses.length === 0) {
    return (
      <div className="text-center text-slate-400 py-16">
        Không có lớp nào trong khối {grade}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-md-outline-variant/20">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-md-surface-container-high">
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-r border-md-outline-variant/20 w-20">
              Thứ
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-r border-md-outline-variant/20 w-14">
              Tiết
            </th>
            {gradeClasses.map((cls) => (
              <th
                key={cls.id}
                className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-r border-md-outline-variant/20 last:border-r-0 cursor-pointer hover:bg-md-surface-container transition-colors"
                onClick={() => onSelectClass(cls.name)}
                title="Xem TKB lớp này"
              >
                <div>Lớp {cls.name}</div>
                {cls.homeroomTeacherName && (
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5 normal-case tracking-normal">
                    {cls.homeroomTeacherName}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) =>
            PERIODS.map((period, pi) => (
              <tr
                key={`${day.value}-${period}`}
                className={`border-t ${
                  pi === 0 ? "border-md-outline-variant/30" : "border-md-outline-variant/10"
                } hover:bg-md-surface-container-low/30 transition-colors`}
              >
                {pi === 0 && (
                  <td
                    rowSpan={PERIODS.length}
                    className="px-4 py-2 border-r border-md-outline-variant/20 font-semibold text-xs text-slate-600 bg-md-surface-container-low/40 align-middle text-center"
                  >
                    {day.label}
                  </td>
                )}
                <td className="px-4 py-2 text-center font-bold text-slate-400 text-xs border-r border-md-outline-variant/20 w-14">
                  {period}
                </td>

                {gradeClasses.map((cls) => {
                  const slot = getSlot(cls.name, day.value, period);
                  const classAssignments = assignments.filter((a) => a.className === cls.name);
                  const clsAsSchoolClass = {
                    id: cls.id,
                    code: "",
                    grade: cls.grade,
                    name: cls.name,
                    studentCount: 0,
                    homeroomTeacher: cls.homeroomTeacherName ?? null,
                    homeroomTeacherId: cls.homeroomTeacherId ?? null,
                    assignmentStatus: (cls.homeroomTeacherId ? "complete" : "incomplete") as "complete" | "incomplete",
                  };
                  return (
                    <td
                      key={cls.id}
                      className="px-1.5 py-1 border-r border-md-outline-variant/10 last:border-r-0 min-w-[130px]"
                    >
                      <CellPopover
                        slot={slot}
                        day={day.value}
                        period={period}
                        classId={cls.name}
                        allSlots={slots}
                        onAddSlot={onAddSlot}
                        onDeleteSlot={onDeleteSlot}
                        readOnly={readOnly}
                        subjects={gradeSubjects}
                        assignments={classAssignments}
                        currentClass={clsAsSchoolClass}
                      >
                        {slot ? (
                          <div
                            className={`rounded-lg px-2 py-1.5 cursor-pointer hover:brightness-95 transition-all ${
                              slot.isConflict
                                ? "bg-md-error-container"
                                : slot.teacherId && slot.teacherId !== cls.homeroomTeacherId?.toString()
                                ? "bg-blue-50"
                                : "bg-slate-50"
                            }`}
                          >
                            <p className={`text-xs font-semibold leading-tight ${slot.isConflict ? "text-md-error" : "text-slate-800"}`}>
                              {slot.subjectName}
                            </p>
                            {slot.teacherName && (
                              <p className={`text-[10px] mt-0.5 leading-tight ${
                                slot.teacherId && slot.teacherId !== cls.homeroomTeacherId?.toString()
                                  ? "text-red-500 font-medium"
                                  : "text-slate-400"
                              }`}>
                                {slot.teacherName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className={`h-10 rounded-lg transition-colors ${readOnly ? "" : "hover:bg-md-surface-container cursor-pointer"}`} />
                        )}
                      </CellPopover>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
