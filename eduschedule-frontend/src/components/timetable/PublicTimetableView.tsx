"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Loader2, CalendarX2 } from "lucide-react";
import { type Slot, mapSlot, computeConflicts } from "@/lib/timetable-data";
import { mapSubject, publicTimetableApi, type PublicTimetableInfoResponse, type WeekResponse } from "@/lib/api";
import { TimetableGrid } from "./TimetableGrid";
import { GradeView } from "./GradeView";
import { TeacherTimetableGrid } from "./TimetablePage";
import { TimetableDragProvider } from "./TimetableDragContext";

const noop = () => {};

export function PublicTimetableView({ token }: { token: string }) {
  const [info, setInfo] = useState<PublicTimetableInfoResponse | null>(null);
  const [weeks, setWeeks] = useState<WeekResponse[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedGrade, setSelectedGrade] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [inTeacherView, setInTeacherView] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  useEffect(() => {
    Promise.all([publicTimetableApi.getInfo(token), publicTimetableApi.getWeeks(token)])
      .then(([infoRes, weeksRes]) => {
        setInfo(infoRes);
        setWeeks(weeksRes);
        if (weeksRes.length > 0) setSelectedWeekId(weeksRes[0].id);
        const firstClass = infoRes.classes[0];
        if (firstClass) setSelectedGrade(firstClass.grade);
        const firstTeacher = infoRes.teachers[0];
        if (firstTeacher) setSelectedTeacherId(firstTeacher.id.toString());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedWeekId) return;
    publicTimetableApi
      .getSlots(token, selectedWeekId)
      .then((rawSlots) => setSlots(rawSlots.map(mapSlot)))
      .catch(() => setSlots([]));
  }, [token, selectedWeekId]);

  const slotsWithConflicts = useMemo(() => computeConflicts(slots), [slots]);

  const classes = useMemo(() => info?.classes ?? [], [info]);
  const subjects = useMemo(() => (info?.subjects ?? []).map(mapSubject), [info]);
  const assignments = useMemo(() => info?.assignments ?? [], [info]);
  const teachers = info?.teachers ?? [];

  const grades = useMemo(() => [...new Set(classes.map((c) => c.grade))].sort(), [classes]);
  const gradeClasses = useMemo(
    () => classes.filter((c) => c.grade === selectedGrade).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [classes, selectedGrade]
  );
  const gradeSubjects = useMemo(
    () => subjects.filter((s) => s.periodsByGrade[selectedGrade - 1] > 0),
    [subjects, selectedGrade]
  );
  const classAssignments = useMemo(
    () => assignments.filter((a) => a.classId.toString() === selectedClassId || classes.find((c) => c.name === selectedClassId)?.id === a.classId),
    [assignments, selectedClassId, classes]
  );
  const currentClassObj = useMemo(() => classes.find((c) => c.name === selectedClassId), [classes, selectedClassId]);
  const teacherSlots = useMemo(
    () => slotsWithConflicts.filter((s) => s.teacherId === selectedTeacherId),
    [slotsWithConflicts, selectedTeacherId]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-md-on-surface-variant gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải thời khoá biểu...
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-md-on-surface-variant py-24">
        <CalendarX2 className="h-10 w-10" />
        <p className="text-lg font-semibold text-md-on-surface">Không tìm thấy thời khoá biểu công khai</p>
        <p className="text-sm">Liên kết không tồn tại hoặc đã bị thu hồi công khai.</p>
      </div>
    );
  }

  return (
    <div className="p-8 flex flex-col gap-6 flex-1 min-h-0">
      <div>
        <h2 className="text-2xl font-extrabold text-md-on-surface tracking-tight font-heading">
          HK{info.semesterOrder} – {info.schoolYearName}
        </h2>
      </div>

      <div className="flex items-center gap-4 flex-wrap shrink-0">
        {!inTeacherView ? (
          <>
            <select
              value={selectedGrade}
              onChange={(e) => { setSelectedGrade(Number(e.target.value)); setSelectedClassId("all"); }}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              {grades.map((g) => <option key={g} value={g}>Khối {g}</option>)}
            </select>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              <option value="all">Cả khối</option>
              {gradeClasses.map((cls) => (
                <option key={cls.id} value={cls.name}>Lớp {cls.name}</option>
              ))}
            </select>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">GV:</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20 min-w-45"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id.toString()}>{t.fullName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {weeks.length > 0 && (
            <select
              value={selectedWeekId ?? ""}
              onChange={(e) => setSelectedWeekId(Number(e.target.value))}
              className="bg-slate-100 border-0 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-md-primary/20"
            >
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Tuần {w.weekNumber}{w.startDate ? ` (${w.startDate})` : ""}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setInTeacherView((v) => !v)}
            className={`flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${
              inTeacherView ? "bg-md-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {inTeacherView ? "Theo lớp" : "Theo GV"}
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {inTeacherView ? (
            <TeacherTimetableGrid
              teacherId={selectedTeacherId}
              slots={slotsWithConflicts}
              teacherSlots={teacherSlots}
              onAddSlot={noop}
              onDeleteSlot={noop}
              readOnly={true}
              subjects={subjects}
              assignments={assignments.filter((a) => a.teacherId?.toString() === selectedTeacherId)}
            />
          ) : selectedClassId === "all" ? (
            <TimetableDragProvider>
              <GradeView
                grade={selectedGrade}
                slots={slotsWithConflicts}
                classes={gradeClasses}
                subjects={subjects}
                assignments={assignments}
                readOnly={true}
                onSelectClass={(name) => setSelectedClassId(name)}
                onAddSlot={noop}
                onDeleteSlot={noop}
              />
            </TimetableDragProvider>
          ) : (
            <TimetableDragProvider>
              <TimetableGrid
                classId={selectedClassId}
                slots={slotsWithConflicts}
                onAddSlot={noop}
                onDeleteSlot={noop}
                readOnly={true}
                subjects={gradeSubjects}
                assignments={classAssignments}
                currentClass={
                  currentClassObj ? {
                    id: currentClassObj.id, code: "", grade: currentClassObj.grade,
                    name: currentClassObj.name, studentCount: 0,
                    homeroomTeacher: currentClassObj.homeroomTeacherName ?? null,
                    homeroomTeacherId: currentClassObj.homeroomTeacherId ?? null,
                    assignmentStatus: currentClassObj.homeroomTeacherId ? "complete" : "incomplete",
                  } : undefined
                }
              />
            </TimetableDragProvider>
          )}
        </div>
      </div>
    </div>
  );
}
