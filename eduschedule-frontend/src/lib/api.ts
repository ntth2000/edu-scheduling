import type { Teacher, Subject, SchoolClass } from "./mock-data";
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
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
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
    apiFetch<TeacherResponse>(`/api/teachers/${id}/toggle-status`, {
      method: "PATCH",
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
};

export const classApi = {
  getAll: () => apiFetch<ClassResponse[]>("/api/classes"),

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
};

export const assignmentApi = {
  assignHomeroom: (classId: number, teacherId: number) =>
    apiFetch<void>("/api/assignments/homeroom", {
      method: "POST",
      body: JSON.stringify({ classId, teacherId }),
    }),

  getByTeacher: (teacherId: number) =>
    apiFetch<AssignmentResponse[]>(`/api/assignments?teacherId=${teacherId}`),
};
