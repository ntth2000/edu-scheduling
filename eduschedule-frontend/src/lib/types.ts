import { type TeacherType, type TeacherStatus, type AssignmentStatus } from "./enums";

export type { TeacherType };

export interface Teacher {
  id: number;
  code: string;
  name: string;
  type: TeacherType;
  position: string;
  subjects: string[];
  maxPeriods: number;
  currentPeriods: number;
  status: TeacherStatus;
}

export interface Subject {
  id: number;
  name: string;
  shortName: string;
  periodsByGrade: [number, number, number, number, number];
}

export interface SchoolClass {
  id: number;
  code: string;
  grade: number;
  name: string;
  studentCount: number;
  homeroomTeacher: string | null;
  homeroomTeacherId: number | null;
  assignmentStatus: AssignmentStatus;
}
