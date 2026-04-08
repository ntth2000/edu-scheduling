// Teacher type
export const TeacherType = {
  CHU_NHIEM: "CHU_NHIEM",
  BO_MON: "BO_MON",
  KHAC: "KHAC",
} as const;
export type TeacherType = (typeof TeacherType)[keyof typeof TeacherType];

// Teacher status
export const TeacherStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
export type TeacherStatus = (typeof TeacherStatus)[keyof typeof TeacherStatus];

// Assignment status
export const AssignmentStatus = {
  COMPLETE: "complete",
  INCOMPLETE: "incomplete",
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];
