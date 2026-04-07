"use client";

import { type Slot, availableSubjects } from "@/lib/timetable-data";
import { mockTeachers } from "@/lib/mock-data";
import { BarChart3, User } from "lucide-react";

interface SidePanelClassProps {
  mode: "class";
  classId: string;
  slots: Slot[];
}

interface SidePanelTeacherProps {
  mode: "teacher";
  teacherId: string;
  slots: Slot[];
}

type TimetableSidePanelProps = SidePanelClassProps | SidePanelTeacherProps;

export function TimetableSidePanel(props: TimetableSidePanelProps) {
  if (props.mode === "teacher") {
    return <TeacherSidePanel teacherId={props.teacherId} slots={props.slots} />;
  }
  return <ClassSidePanel classId={props.classId} slots={props.slots} />;
}

function ClassSidePanel({ classId, slots }: { classId: string; slots: Slot[] }) {
  const classSlots = slots.filter((s) => s.classId === classId);
  const totalNeeded = 35;
  const filled = classSlots.length;
  const ratio = filled / totalNeeded;

  // Find missing subjects
  const subjectCounts: Record<string, number> = {};
  classSlots.forEach((s) => {
    subjectCounts[s.subjectId] = (subjectCounts[s.subjectId] || 0) + 1;
  });

  // Required periods per subject (simplified)
  const requiredPeriods: Record<string, number> = {
    toan: 4, tv: 7, ta: 4, gdtc: 2, tin: 2, an: 1, mt: 1, hdtn: 2, lsdl: 2, dd: 1,
  };

  const missingSubjects = Object.entries(requiredPeriods)
    .map(([id, required]) => {
      const current = subjectCounts[id] || 0;
      const missing = required - current;
      const subject = availableSubjects.find((s) => s.id === id);
      return { id, name: subject?.name || id, missing, current, required };
    })
    .filter((s) => s.missing > 0);

  // GV bộ môn for this class
  const bmTeachers = classSlots
    .filter((s) => s.teacherId)
    .reduce(
      (acc, s) => {
        if (!acc.find((a) => a.teacherId === s.teacherId)) {
          const subject = availableSubjects.find((sub) => sub.id === s.subjectId);
          const assigned = classSlots.filter((cs) => cs.teacherId === s.teacherId).length;
          const required = requiredPeriods[s.subjectId] || 2;
          acc.push({
            teacherId: s.teacherId!,
            teacherName: s.teacherName!,
            subjectName: subject?.name || s.subjectName,
            assigned,
            required,
          });
        }
        return acc;
      },
      [] as { teacherId: string; teacherName: string; subjectName: string; assigned: number; required: number }[]
    );

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
                className="flex justify-between items-center p-3 bg-md-surface-container-low rounded-xl"
              >
                <span className="text-sm font-semibold text-slate-700">{sub.name}</span>
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

function TeacherSidePanel({ teacherId, slots }: { teacherId: string; slots: Slot[] }) {
  const teacherSlots = slots.filter((s) => s.teacherId === teacherId);
  const teacher = mockTeachers.find(
    (t) => t.name === teacherSlots[0]?.teacherName || t.id.toString() === teacherId
  );
  const teacherName = teacherSlots[0]?.teacherName || teacherId;
  const maxPeriods = teacher?.maxPeriods || 23;
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
