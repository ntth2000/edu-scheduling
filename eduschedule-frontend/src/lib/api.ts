import type { Teacher, Subject, SchoolClass } from "./types";
import { type TeacherType } from "./enums";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Backend response types (mirrors Java DTOs)

export interface TeacherResponse {
  id: number;
  fullName: string;
  type: TeacherType;
  maxPeriodsPerWeek: number;
  isActive: boolean;
  subjects: SubjectResponse[];
  currentPeriodsPerWeek: number;
  homeroomClassName: string | null;
}

export interface SubjectResponse {
  id: number;
  name: string;
  shortName: string;
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

export interface TeacherCascadeResponse {
  teacher: TeacherResponse;
  deletedAssignments: number;
  deletedSlots: number;
  unsetHomeroomClasses: string[];
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
  subjectShortName: string;
  teacherId: number;
  teacherName: string;
  periodsPerWeek: number;
}

// Mappers: backend response → frontend types

export function mapTeacher(t: TeacherResponse): Teacher {
  return {
    id: t.id,
    code: `GV${String(t.id).padStart(3, "0")}`,
    name: t.fullName,
    type: t.type,
    position: "Giáo viên",
    subjects: t.subjects.map((s) => s.name),
    maxPeriods: t.maxPeriodsPerWeek,
    currentPeriods: t.currentPeriodsPerWeek ?? 0,
    status: t.isActive ? "active" : "inactive",
  };
}

export function mapSubject(s: SubjectResponse): Subject {
  return {
    id: s.id,
    name: s.name,
    shortName: s.shortName,
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
      return json.message || json.error || "Unknown error";
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
  type: TeacherType;
  maxPeriodsPerWeek: number;
  subjectIds: number[];
}

export interface SubjectRequest {
  name: string;
  shortName: string;
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

  toggleStatus: (id: number) =>
    apiFetch<TeacherCascadeResponse>(`/api/teachers/${id}/toggle-status`, {
      method: "PATCH",
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
  name: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  createdAt: string;
}

export interface SlotResponse {
  id: number;
  timetableId: number;
  assignmentId: number;
  day: number;
  period: number;
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

  create: (name?: string) =>
    apiFetch<TimetableResponse>("/api/timetables", {
      method: "POST",
      body: JSON.stringify({ name: name ?? null }),
    }),

  updateStatus: (id: number, status: "DRAFT" | "PUBLISHED") =>
    apiFetch<TimetableResponse>(`/api/timetables/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export const slotApi = {
  getByTimetable: (timetableId: number) =>
    apiFetch<SlotResponse[]>(`/api/slots?timetableId=${timetableId}`),

  save: (params: { timetableId: number; day: number; period: number; assignmentId?: number; classId?: number; subjectId?: number }) =>
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
