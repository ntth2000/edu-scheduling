export type TeacherType = "CHU_NHIEM" | "BO_MON" | "KHAC";

export interface Teacher {
  id: number;
  code: string;
  name: string;
  type: TeacherType;
  position: string;
  subjects: string[];
  maxPeriods: number;
  currentPeriods: number;
  status: "active" | "inactive";
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
  assignmentStatus: "complete" | "incomplete";
}

export const mockTeachers: Teacher[] = [
  {
    id: 1, code: "GV001", name: "Vũ Hường", type: "CHU_NHIEM",
    position: "Giáo viên", subjects: ["Toán", "Tiếng Việt"],
    maxPeriods: 23, currentPeriods: 15, status: "active",
  },
  {
    id: 2, code: "GV002", name: "Nguyễn Huyền", type: "CHU_NHIEM",
    position: "Tổ trưởng", subjects: ["Toán", "Tiếng Việt"],
    maxPeriods: 22, currentPeriods: 19, status: "active",
  },
  {
    id: 3, code: "GV003", name: "Liên", type: "BO_MON",
    position: "Giáo viên", subjects: ["Tiếng Anh"],
    maxPeriods: 23, currentPeriods: 18, status: "active",
  },
  {
    id: 4, code: "GV004", name: "Nghị", type: "BO_MON",
    position: "Giáo viên", subjects: ["GDTC"],
    maxPeriods: 23, currentPeriods: 20, status: "active",
  },
  {
    id: 5, code: "GV005", name: "Thảo", type: "BO_MON",
    position: "Giáo viên", subjects: ["Tin học"],
    maxPeriods: 23, currentPeriods: 9, status: "active",
  },
  {
    id: 6, code: "GV006", name: "Hải", type: "BO_MON",
    position: "Giáo viên", subjects: ["Âm nhạc"],
    maxPeriods: 23, currentPeriods: 6, status: "active",
  },
  {
    id: 7, code: "GV007", name: "Phí Xuân", type: "BO_MON",
    position: "Giáo viên", subjects: ["Mĩ thuật"],
    maxPeriods: 23, currentPeriods: 9, status: "active",
  },
];

export const mockSubjects: Subject[] = [
  { id: 1, name: "Toán", shortName: "Toán", periodsByGrade: [4, 4, 4, 4, 4] },
  { id: 2, name: "Tiếng Việt", shortName: "TV", periodsByGrade: [10, 9, 8, 7, 7] },
  { id: 3, name: "Tiếng Anh", shortName: "TA", periodsByGrade: [0, 0, 3, 4, 4] },
  { id: 4, name: "Giáo dục thể chất", shortName: "GDTC", periodsByGrade: [2, 2, 2, 2, 2] },
  { id: 5, name: "Tin học", shortName: "Tin", periodsByGrade: [0, 0, 2, 2, 2] },
  { id: 6, name: "Âm nhạc", shortName: "ÂN", periodsByGrade: [1, 1, 1, 1, 1] },
  { id: 7, name: "Mĩ thuật", shortName: "MT", periodsByGrade: [1, 1, 1, 1, 1] },
  { id: 8, name: "Hoạt động trải nghiệm", shortName: "HĐTN", periodsByGrade: [2, 2, 2, 2, 2] },
  { id: 9, name: "Lịch sử & Địa lý", shortName: "LS&ĐL", periodsByGrade: [0, 0, 0, 2, 2] },
];

export const mockClasses: SchoolClass[] = [
  { id: 1, code: "4A_2024", grade: 4, name: "4A", studentCount: 35, homeroomTeacher: "Vũ Hường", assignmentStatus: "complete" },
  { id: 2, code: "4B_2024", grade: 4, name: "4B", studentCount: 32, homeroomTeacher: "Nguyễn Huyền", assignmentStatus: "complete" },
  { id: 3, code: "4C_2024", grade: 4, name: "4C", studentCount: 34, homeroomTeacher: "Hiếu", assignmentStatus: "incomplete" },
];
