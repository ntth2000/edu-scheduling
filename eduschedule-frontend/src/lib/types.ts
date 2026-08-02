import { type AssignmentStatus } from "./enums";

export interface Teacher {
  id: number;
  code: string;
  name: string;
  position: string;
  subjects: string[];
  maxPeriods: number;
  currentPeriods: number;
  scheduled: boolean;
}

export interface Subject {
  id: number;
  name: string;
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
