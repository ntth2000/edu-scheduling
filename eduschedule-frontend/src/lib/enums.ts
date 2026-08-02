// Assignment status
export const AssignmentStatus = {
  COMPLETE: "complete",
  INCOMPLETE: "incomplete",
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];
