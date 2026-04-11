"use client";

import { type Slot } from "@/lib/timetable-data";
import { BarChart3, User, GripVertical } from "lucide-react";
import { type AssignmentResponse, type TeacherResponse } from "@/lib/api";
import { useTimetableDrag } from "./TimetableDragContext";

import { type Subject, type SchoolClass } from "@/lib/types";

interface SidePanelClassProps {
  mode: "class";
  classId: string;
  slots: Slot[];
  subjects: Subject[];
  assignments: AssignmentResponse[];
  currentClass?: SchoolClass;
  teachers?: TeacherResponse[];
}

interface SidePanelTeacherProps {
  mode: "teacher";
  teacherId: string;
  slots: Slot[];
  subjects: Subject[];
  assignments: AssignmentResponse[];
  teachers?: TeacherResponse[];
}

type TimetableSidePanelProps = SidePanelClassProps | SidePanelTeacherProps;

export function TimetableSidePanel(props: TimetableSidePanelProps) {
  if (props.mode === "teacher") {
    return <TeacherSidePanel teacherId={props.teacherId} slots={props.slots} teachers={props.teachers ?? []} />;
  }
  return (
    <ClassSidePanel
      classId={props.classId}
      slots={props.slots}
      subjects={props.subjects}
      assignments={props.assignments}
      currentClass={props.currentClass}
    />
  );
}

function ClassSidePanel({
  classId,
  slots,
  subjects,
  assignments,
  currentClass,
}: {
  classId: string;
  slots: Slot[];
  subjects: Subject[];
  assignments: AssignmentResponse[];
  currentClass?: SchoolClass;
}) {
  const { setIsDragging } = useTimetableDrag();
  const classSlots = slots.filter((s) => s.classId === classId);
  const gradeIndex = currentClass ? currentClass.grade - 1 : 3; // Default to Grade 4 if not found
  const totalNeeded = subjects.reduce(
    (acc, s) => acc + (s.periodsByGrade[gradeIndex] || 0),
    0
  );
  const filled = classSlots.length;
  const ratio = filled / totalNeeded;

  // Find missing subjects
  const subjectCounts: Record<string, number> = {};
  classSlots.forEach((s) => {
    subjectCounts[s.subjectId] = (subjectCounts[s.subjectId] || 0) + 1;
  });

  const missingSubjects = subjects
    .map((s) => {
      const required = s.periodsByGrade[gradeIndex] || 0;
      const current = subjectCounts[s.id] || 0;
      const missing = required - current;
      return { id: s.id, name: s.name, missing, current, required };
    })
    .filter((s) => s.missing > 0);

  const handleDragStart = (e: React.DragEvent, sub: typeof missingSubjects[number]) => {
    const assignment = assignments.find(
      (a) => a.className === classId && a.subjectId === sub.id
    );
    const dragData = {
      subjectId: sub.id.toString(),
      subjectName: sub.name,
      subjectNumericId: sub.id,
      ...(assignment
        ? {
            assignmentId: assignment.id,
            teacherId: assignment.teacherId.toString(),
            teacherName: assignment.teacherName,
          }
        : {
            classNumericId: currentClass?.id,
            homeroomTeacherId: currentClass?.homeroomTeacherId?.toString() ?? null,
            homeroomTeacherName: currentClass?.homeroomTeacher ?? null,
          }),
    };
    e.dataTransfer.setData("application/timetable-subject", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // GV bộ môn for this class from assignments
  const bmTeachers = assignments
    .filter((a) => a.className === classId)
    .map((a) => {
      const assigned = classSlots.filter((cs) => cs.subjectId === a.subjectId.toString()).length;
      return {
        teacherId: a.teacherId.toString(),
        teacherName: a.teacherName,
        subjectName: a.subjectName,
        assigned,
        required: a.periodsPerWeek,
      };
    });

  return (
    <div className="w-72 space-y-6">
      {/* Progress */}
      <div className="bg-md-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-md-primary/10 flex items-center justify-center text-md-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-none font-heading">
              Thống kê lớp {classId}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">
              Năm học 2024-2025
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-slate-700">Tổng tiết đã xếp</span>
            <span className="text-xs font-extrabold text-md-primary">
              {filled}/{totalNeeded}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all"
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Missing subjects */}
        {missingSubjects.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cần xếp thêm
            </h4>
            {missingSubjects.map((sub) => (
              <div
                key={sub.id}
                draggable
                onDragStart={(e) => handleDragStart(e, sub)}
                onDragEnd={handleDragEnd}
                className="flex justify-between items-center p-3 bg-md-surface-container-low rounded-xl cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-md-primary-fixed/10 transition-all select-none"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700">{sub.name}</span>
                </div>
                <span className="px-2 py-1 bg-white rounded-lg text-xs font-bold text-amber-600 border border-slate-100">
                  {String(sub.missing).padStart(2, "0")} tiết
                </span>
              </div>
            ))}
          </div>
        )}
        {missingSubjects.length === 0 && (
          <p className="text-sm text-emerald-600 font-medium">✓ Đã đủ tất cả môn</p>
        )}
      </div>

      {/* BM teachers */}
      <div className="bg-md-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
          GV bộ môn lớp này
        </h4>
        <div className="space-y-3">
          {bmTeachers.map((t) => {
            const r = t.assigned / t.required;
            const color = r >= 1 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
            return (
              <div key={t.teacherId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{t.teacherName}</p>
                    <p className="text-[10px] text-slate-500">{t.subjectName}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${color}`}>
                  {t.assigned}/{t.required} tiết
                </span>
              </div>
            );
          })}
          {bmTeachers.length === 0 && (
            <p className="text-xs text-slate-400 italic">Chưa có GV bộ môn</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TeacherSidePanel({ teacherId, slots, teachers }: { teacherId: string; slots: Slot[]; teachers: TeacherResponse[] }) {
  const teacherSlots = slots.filter((s) => s.teacherId === teacherId);
  const teacher = teachers.find((t) => t.id.toString() === teacherId);
  const teacherName = teacher?.fullName ?? teacherSlots[0]?.teacherName ?? teacherId;
  const maxPeriods = teacher?.maxPeriodsPerWeek ?? 23;
  const currentPeriods = teacherSlots.length;
  const periodsRatio = currentPeriods / maxPeriods;

  // Unique days
  const uniqueDays = new Set(teacherSlots.map((s) => s.day));
  const sessions = uniqueDays.size;

  // Classes grouped
  const classCounts: Record<string, number> = {};
  teacherSlots.forEach((s) => {
    classCounts[s.classId] = (classCounts[s.classId] || 0) + 1;
  });

  const periodColor =
    periodsRatio >= 1 ? "text-md-error" : periodsRatio >= 0.8 ? "text-amber-600" : "text-emerald-600";
  const periodBarColor =
    periodsRatio >= 1 ? "bg-md-error" : periodsRatio >= 0.8 ? "bg-amber-500" : "bg-emerald-500";
  const sessionColor = sessions > 5 ? "text-amber-600" : "text-emerald-600";
  const sessionBarColor = sessions > 5 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="w-72 space-y-6">
      <div className="bg-md-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <p className="font-semibold mb-4 font-heading">{teacherName}</p>

        {/* Periods/week */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Số tiết/tuần</span>
            <span className={`font-semibold ${periodColor}`}>
              {currentPeriods}/{maxPeriods}
            </span>
          </div>
          <div className="h-2 bg-md-surface-container rounded-full">
            <div
              className={`h-2 rounded-full ${periodBarColor}`}
              style={{ width: `${Math.min(periodsRatio * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Sessions/week */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Số buổi/tuần</span>
            <span className={`font-semibold ${sessionColor}`}>{sessions}/5</span>
          </div>
          <div className="h-2 bg-md-surface-container rounded-full">
            <div
              className={`h-2 rounded-full ${sessionBarColor}`}
              style={{ width: `${(sessions / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Classes */}
      <div className="bg-md-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <p className="font-semibold text-sm mb-3 font-heading">Lớp đang dạy</p>
        {Object.entries(classCounts).map(([cls, count]) => (
          <div
            key={cls}
            className="flex justify-between text-sm py-1.5 border-b border-md-outline-variant/10 last:border-0"
          >
            <span>Lớp {cls}</span>
            <span className="text-md-on-surface/50">{count} tiết</span>
          </div>
        ))}
      </div>
    </div>
  );
}
