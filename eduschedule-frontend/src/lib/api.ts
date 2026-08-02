import type { Teacher, Subject, SchoolClass } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Origin of this frontend app itself (for building shareable links like the
// public timetable URL) — NOT the backend API. Falls back to the browser's
// current origin when the env var isn't set (e.g. local dev).
export function getAppOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
}

export function getPublicTimetableUrl(publicToken: string): string {
  return `${getAppOrigin()}/public/timetable/${publicToken}`;
}

// Backend response types (mirrors Java DTOs)

export interface TeacherResponse {
  id: number;
  fullName: string;
  maxPeriodsPerWeek: number;
  subjects: SubjectResponse[];
  currentPeriodsPerWeek: number;
  homeroomClassName: string | null;
  scheduled: boolean;
}

export interface SubjectResponse {
  id: number;
  name: string;
  periodsGrade1: number;
  periodsGrade2: number;
  periodsGrade3: number;
  periodsGrade4: number;
  periodsGrade5: number;
}

export interface ClassResponse {
  id: number;
  name: string;
  grade: number;
  homeroomTeacherId: number | null;
  homeroomTeacherName: string | null;
  schoolYearId: number | null;
}

export interface BatchDeleteCascadeResponse {
  deletedTeachers: number;
  deletedAssignments: number;
  deletedSlots: number;
  unsetHomeroomClasses: string[];
}

export interface AssignmentResponse {
  id: number;
  classId: number;
  className: string;
  grade: number;
  subjectId: number;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
  periodsPerWeek: number;
}

// Mappers: backend response → frontend types

export function mapTeacher(t: TeacherResponse): Teacher {
  return {
    id: t.id,
    code: `GV${String(t.id).padStart(3, "0")}`,
    name: t.fullName,
    position: "Giáo viên",
    subjects: t.subjects.map((s) => s.name),
    maxPeriods: t.maxPeriodsPerWeek,
    currentPeriods: t.currentPeriodsPerWeek ?? 0,
    scheduled: t.scheduled ?? false,
  };
}

export function mapSubject(s: SubjectResponse): Subject {
  return {
    id: s.id,
    name: s.name,
    periodsByGrade: [s.periodsGrade1, s.periodsGrade2, s.periodsGrade3, s.periodsGrade4, s.periodsGrade5],
  };
}

export function mapClass(c: ClassResponse): SchoolClass {
  return {
    id: c.id,
    code: `${c.name}_2024`,
    grade: c.grade,
    name: c.name,
    studentCount: 0,
    homeroomTeacher: c.homeroomTeacherName ?? null,
    homeroomTeacherId: c.homeroomTeacherId ?? null,
    assignmentStatus: c.homeroomTeacherId ? "complete" : "incomplete",
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg: string;
    try {
      const json = JSON.parse(text);
      msg = json.message || json.error || `HTTP ${res.status}`;
    } catch {
      msg = text;
    }
    throw new Error(msg || res.statusText || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Request types

export interface TeacherRequest {
  fullName: string;
  maxPeriodsPerWeek: number;
  subjectIds: number[];
}

export interface SubjectRequest {
  name: string;
  periodsGrade1: number;
  periodsGrade2: number;
  periodsGrade3: number;
  periodsGrade4: number;
  periodsGrade5: number;
}

export interface ClassRequest {
  name: string;
  grade: number;
  homeroomTeacherId?: number | null;
  schoolYearId?: number | null;
}

// API clients

export const teacherApi = {
  getAll: () => apiFetch<TeacherResponse[]>("/api/teachers"),

  create: (body: TeacherRequest) =>
    apiFetch<TeacherResponse>("/api/teachers", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: number, body: TeacherRequest) =>
    apiFetch<TeacherResponse>(`/api/teachers/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteBatch: (ids: number[]) =>
    apiFetch<BatchDeleteCascadeResponse>("/api/teachers/batch", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};

export const subjectApi = {
  getAll: () => apiFetch<SubjectResponse[]>("/api/subjects"),

  create: (body: SubjectRequest) =>
    apiFetch<SubjectResponse>("/api/subjects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: number, body: SubjectRequest) =>
    apiFetch<SubjectResponse>(`/api/subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/subjects/${id}`, { method: "DELETE" }),

  deleteBatch: (ids: number[]) =>
    apiFetch<void>("/api/subjects/batch", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};

export const classApi = {
  getAll: (year?: string | null) =>
    apiFetch<ClassResponse[]>(year ? `/api/classes?year=${encodeURIComponent(year)}` : "/api/classes"),

  create: (body: ClassRequest) =>
    apiFetch<ClassResponse>("/api/classes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: number, body: ClassRequest) =>
    apiFetch<ClassResponse>(`/api/classes/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/classes/${id}`, { method: "DELETE" }),

  deleteBatch: (ids: number[]) =>
    apiFetch<void>("/api/classes/batch", {
      method: "DELETE",
      body: JSON.stringify(ids),
    }),
};

export interface TimetableResponse {
  id: number;
  schoolYearId: number;
  schoolYearName: string;
  semesterOrder: number;
  semesterStartDate?: string;
  createdAt: string;
  isPublic: boolean;
  publicToken: string | null;
}

export interface WeekResponse {
  id: number;
  timetableId: number;
  weekNumber: number;
  startDate: string | null;
  endDate: string | null;
  isPublished: boolean;
}

export interface WeekPublishStatusResponse {
  weekId: number;
  weekNumber: number;
  isPublished: boolean;
  eligible: boolean;
  reason: string | null;
}

export interface SlotResponse {
  id: number;
  weekId: number;
  weekNumber: number;
  assignmentId: number;
  day: number;
  session: number;
  period: number;
  specialRoomId?: number;
  subjectId: number;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
  classId: number;
  className: string;
  grade: number;
}

export const timetableApi = {
  getAll: () => apiFetch<TimetableResponse[]>("/api/timetables"),

  getBySchoolYear: (schoolYearId: number) =>
    apiFetch<TimetableResponse[]>(`/api/timetables?schoolYearId=${schoolYearId}`),

  getById: (id: number) => apiFetch<TimetableResponse>(`/api/timetables/${id}`),

  create: (params: { schoolYearId: number; semesterOrder: number }) =>
    apiFetch<TimetableResponse>("/api/timetables", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getPublishStatus: (id: number) =>
    apiFetch<WeekPublishStatusResponse[]>(`/api/timetables/${id}/publish-status`),

  publish: (id: number, weekIds: number[]) =>
    apiFetch<TimetableResponse>(`/api/timetables/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ weekIds }),
    }),

  unpublishWeek: (id: number, weekId: number) =>
    apiFetch<void>(`/api/timetables/${id}/weeks/${weekId}/unpublish`, { method: "POST" }),
};

export interface AutoScheduleSlot {
  day: number;
  period: number;
  className: string;
  classId: number;
  subjectId: number;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
  assignmentId: number;
}

export interface AutoScheduleResult {
  slots: AutoScheduleSlot[];
  errors: string[];
}

export const weekApi = {
  getByTimetable: (timetableId: number) =>
    apiFetch<WeekResponse[]>(`/api/weeks?timetableId=${timetableId}`),

  updateStartDate: (weekId: number, startDate: string) =>
    apiFetch<WeekResponse[]>(`/api/weeks/${weekId}/start-date`, {
      method: "PATCH",
      body: JSON.stringify({ startDate }),
    }),

  applyForward: (weekId: number) =>
    apiFetch<void>(`/api/weeks/${weekId}/apply-forward`, {
      method: "POST",
    }),

  generate: (weekId: number) =>
    apiFetch<AutoScheduleResult>(`/api/weeks/${weekId}/generate`, {
      method: "POST",
    }),
};

export const slotApi = {
  getByWeek: (weekId: number) =>
    apiFetch<SlotResponse[]>(`/api/slots?weekId=${weekId}`),

  save: (params: { weekId: number; assignmentId?: number; classId?: number; subjectId?: number; day: number; session: number; period: number; specialRoomId?: number }) =>
    apiFetch<SlotResponse>("/api/slots", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/slots/${id}`, { method: "DELETE" }),
};

export interface SchoolYearResponse {
  id: number;
  name: string;
  startYear: number;
}

export const schoolYearApi = {
  getAll: () => apiFetch<SchoolYearResponse[]>("/api/school-years"),
  create: (startYear: number) =>
    apiFetch<SchoolYearResponse>("/api/school-years", {
      method: "POST",
      body: JSON.stringify({ startYear }),
    }),
  delete: (id: number) =>
    apiFetch<void>(`/api/school-years/${id}`, { method: "DELETE" }),
};

export interface SpecialRoomResponse {
  id: number;
  name: string;
  quantity: number;
  subjectId: number | null;
  subjectName: string | null;
}

export interface SpecialRoomRequest {
  name: string;
  quantity: number;
  subjectId?: number | null;
}

export const specialRoomApi = {
  getAll: () => apiFetch<SpecialRoomResponse[]>("/api/special-rooms"),

  create: (body: SpecialRoomRequest) =>
    apiFetch<SpecialRoomResponse>("/api/special-rooms", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: number, body: SpecialRoomRequest) =>
    apiFetch<SpecialRoomResponse>(`/api/special-rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/api/special-rooms/${id}`, { method: "DELETE" }),
};

export const assignmentApi = {
  assignHomeroom: (classId: number, teacherId: number) =>
    apiFetch<void>("/api/assignments/homeroom", {
      method: "POST",
      body: JSON.stringify({ classId, teacherId }),
    }),

  getAll: (year?: string | null) =>
    apiFetch<AssignmentResponse[]>(year ? `/api/assignments?year=${encodeURIComponent(year)}` : "/api/assignments"),

  assign: (classId: number, subjectId: number, teacherId: number) =>
    apiFetch<AssignmentResponse>("/api/assignments", {
      method: "POST",
      body: JSON.stringify({ classId, subjectId, teacherId }),
    }),

  deleteAssignment: (id: number) =>
    apiFetch<void>(`/api/assignments/${id}`, { method: "DELETE" }),

  getByTeacher: (teacherId: number) =>
    apiFetch<AssignmentResponse[]>(`/api/assignments?teacherId=${teacherId}`),
};

export interface PublicTimetableInfoResponse {
  schoolYearName: string;
  semesterOrder: number;
  classes: ClassResponse[];
  teachers: TeacherResponse[];
  subjects: SubjectResponse[];
  assignments: AssignmentResponse[];
}

export const publicTimetableApi = {
  getInfo: (token: string) =>
    apiFetch<PublicTimetableInfoResponse>(`/api/public/timetables/${token}`),

  getWeeks: (token: string) =>
    apiFetch<WeekResponse[]>(`/api/public/timetables/${token}/weeks`),

  getSlots: (token: string, weekId: number) =>
    apiFetch<SlotResponse[]>(`/api/public/timetables/${token}/slots?weekId=${weekId}`),
};
