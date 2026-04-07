export type AssignmentMode = "homeroom" | "subject";

export interface HomeroomAssignment {
  classId: number;
  classCode: string;
  className: string;
  grade: number;
  teacherId: number | null;
}

export interface SubjectTeacherAssignment {
  teacherId: number;
  teacherCode: string;
  teacherName: string;
  assignedSubjects: string[];
  periodsPerWeek: number;
}

export const subjectColors: Record<string, { bg: string; text: string; hover: string }> = {
  "Tiếng Anh": { bg: "bg-emerald-100", text: "text-emerald-700", hover: "hover:text-emerald-900" },
  "GDTC": { bg: "bg-amber-100", text: "text-amber-700", hover: "hover:text-amber-900" },
  "Giáo dục thể chất": { bg: "bg-amber-100", text: "text-amber-700", hover: "hover:text-amber-900" },
  "Tin học": { bg: "bg-violet-100", text: "text-violet-700", hover: "hover:text-violet-900" },
  "Âm nhạc": { bg: "bg-blue-100", text: "text-blue-700", hover: "hover:text-blue-900" },
  "Mĩ thuật": { bg: "bg-pink-100", text: "text-pink-700", hover: "hover:text-pink-900" },
  "Toán": { bg: "bg-sky-100", text: "text-sky-700", hover: "hover:text-sky-900" },
  "Tiếng Việt": { bg: "bg-orange-100", text: "text-orange-700", hover: "hover:text-orange-900" },
};

export const defaultSubjectColor = { bg: "bg-slate-100", text: "text-slate-700", hover: "hover:text-slate-900" };
