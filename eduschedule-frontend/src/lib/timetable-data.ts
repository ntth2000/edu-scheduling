export type ViewMode = "class" | "teacher" | "grade";

export interface Slot {
  id: string;
  day: number; // 2-6 (Thứ 2 → Thứ 6)
  period: number; // 1-7
  classId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string | null; // null = GVCN tự dạy
  teacherName: string | null;
  isConflict: boolean;
}

export const DAYS = [
  { value: 2, label: "Thứ 2" },
  { value: 3, label: "Thứ 3" },
  { value: 4, label: "Thứ 4" },
  { value: 5, label: "Thứ 5" },
  { value: 6, label: "Thứ 6" },
];

export const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export const CLASSES_BY_GRADE: Record<number, string[]> = {
  1: ["1A", "1B"],
  2: ["2A", "2B"],
  3: ["3A", "3B"],
  4: ["4A", "4B", "4C"],
  5: ["5A", "5B"],
};

export const mockSlots: Slot[] = [
  // ── Lớp 4A ──────────────────────────────────────
  // Thứ 2
  { id: "4a-t2-1", day: 2, period: 1, classId: "4A", subjectId: "hdtn", subjectName: "HĐTN", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t2-2", day: 2, period: 2, classId: "4A", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t2-3", day: 2, period: 3, classId: "4A", subjectId: "mt", subjectName: "Mĩ thuật", teacherId: "phi-xuan", teacherName: "Phí Xuân", isConflict: false },
  { id: "4a-t2-4", day: 2, period: 4, classId: "4A", subjectId: "tv", subjectName: "Bài đọc", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t2-5", day: 2, period: 5, classId: "4A", subjectId: "tv", subjectName: "Bài đọc", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t2-6", day: 2, period: 6, classId: "4A", subjectId: "lsdl", subjectName: "LS&ĐL", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t2-7", day: 2, period: 7, classId: "4A", subjectId: "lsdl", subjectName: "LS&ĐL", teacherId: null, teacherName: null, isConflict: false },

  // Thứ 3
  { id: "4a-t3-1", day: 3, period: 1, classId: "4A", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t3-2", day: 3, period: 2, classId: "4A", subjectId: "ta", subjectName: "Tiếng Anh", teacherId: "lien", teacherName: "Liên", isConflict: false },
  { id: "4a-t3-3", day: 3, period: 3, classId: "4A", subjectId: "tv", subjectName: "Chính tả", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t3-4", day: 3, period: 4, classId: "4A", subjectId: "tv", subjectName: "Luyện từ", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t3-5", day: 3, period: 5, classId: "4A", subjectId: "gdtc", subjectName: "GDTC", teacherId: "nghi", teacherName: "Nghị", isConflict: false },
  { id: "4a-t3-6", day: 3, period: 6, classId: "4A", subjectId: "tin", subjectName: "Tin học", teacherId: "thao", teacherName: "Thảo", isConflict: false },

  // Thứ 4
  { id: "4a-t4-1", day: 4, period: 1, classId: "4A", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t4-2", day: 4, period: 2, classId: "4A", subjectId: "tv", subjectName: "Tập đọc", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t4-3", day: 4, period: 3, classId: "4A", subjectId: "tv", subjectName: "Kể chuyện", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t4-4", day: 4, period: 4, classId: "4A", subjectId: "an", subjectName: "Âm nhạc", teacherId: "hai", teacherName: "Hải", isConflict: false },

  // Thứ 5
  { id: "4a-t5-1", day: 5, period: 1, classId: "4A", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t5-2", day: 5, period: 2, classId: "4A", subjectId: "tv", subjectName: "Tập làm văn", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t5-3", day: 5, period: 3, classId: "4A", subjectId: "ta", subjectName: "Tiếng Anh", teacherId: "lien", teacherName: "Liên", isConflict: false },
  { id: "4a-t5-4", day: 5, period: 4, classId: "4A", subjectId: "gdtc", subjectName: "GDTC", teacherId: "nghi", teacherName: "Nghị", isConflict: false },

  // Thứ 6
  { id: "4a-t6-1", day: 6, period: 1, classId: "4A", subjectId: "tv", subjectName: "Tập đọc", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t6-2", day: 6, period: 2, classId: "4A", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t6-3", day: 6, period: 3, classId: "4A", subjectId: "tv", subjectName: "Tập làm văn", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t6-4", day: 6, period: 4, classId: "4A", subjectId: "hdtn", subjectName: "HĐTN", teacherId: null, teacherName: null, isConflict: false },
  { id: "4a-t6-5", day: 6, period: 5, classId: "4A", subjectId: "shtt", subjectName: "Sinh hoạt", teacherId: null, teacherName: null, isConflict: false },

  // ── Lớp 4B ──────────────────────────────────────
  { id: "4b-t2-1", day: 2, period: 1, classId: "4B", subjectId: "hdtn", subjectName: "HĐTN", teacherId: null, teacherName: null, isConflict: false },
  { id: "4b-t2-2", day: 2, period: 2, classId: "4B", subjectId: "ta", subjectName: "Tiếng Anh", teacherId: "lien", teacherName: "Liên", isConflict: false },
  { id: "4b-t2-3", day: 2, period: 3, classId: "4B", subjectId: "tv", subjectName: "Bài đọc", teacherId: null, teacherName: null, isConflict: false },
  { id: "4b-t2-4", day: 2, period: 4, classId: "4B", subjectId: "tv", subjectName: "Bài đọc", teacherId: null, teacherName: null, isConflict: false },
  { id: "4b-t2-5", day: 2, period: 5, classId: "4B", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4b-t3-1", day: 3, period: 1, classId: "4B", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4b-t3-2", day: 3, period: 2, classId: "4B", subjectId: "ta", subjectName: "Tiếng Anh", teacherId: "lien", teacherName: "Liên", isConflict: true },
  { id: "4b-t3-3", day: 3, period: 3, classId: "4B", subjectId: "gdtc", subjectName: "GDTC", teacherId: "nghi", teacherName: "Nghị", isConflict: false },
  { id: "4b-t3-4", day: 3, period: 4, classId: "4B", subjectId: "tin", subjectName: "Tin học", teacherId: "thao", teacherName: "Thảo", isConflict: false },

  // ── Lớp 4C ──────────────────────────────────────
  { id: "4c-t2-1", day: 2, period: 1, classId: "4C", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
  { id: "4c-t2-2", day: 2, period: 2, classId: "4C", subjectId: "tv", subjectName: "Tiếng Việt", teacherId: null, teacherName: null, isConflict: false },
  { id: "4c-t2-3", day: 2, period: 3, classId: "4C", subjectId: "ta", subjectName: "Tiếng Anh", teacherId: "lien", teacherName: "Liên", isConflict: false },
  { id: "4c-t3-1", day: 3, period: 1, classId: "4C", subjectId: "mt", subjectName: "Mĩ thuật", teacherId: "phi-xuan", teacherName: "Phí Xuân", isConflict: false },
  { id: "4c-t3-2", day: 3, period: 2, classId: "4C", subjectId: "toan", subjectName: "Toán", teacherId: null, teacherName: null, isConflict: false },
];

export function checkConflict(
  newSlot: { day: number; period: number; classId: string; teacherId: string | null },
  existingSlots: Slot[]
): { hasConflict: boolean; reason?: string } {
  const classConflict = existingSlots.find(
    (s) => s.day === newSlot.day && s.period === newSlot.period && s.classId === newSlot.classId
  );
  if (classConflict)
    return { hasConflict: true, reason: `Lớp đã có môn ${classConflict.subjectName} tiết này` };

  if (newSlot.teacherId) {
    const teacherConflict = existingSlots.find(
      (s) => s.day === newSlot.day && s.period === newSlot.period && s.teacherId === newSlot.teacherId
    );
    if (teacherConflict)
      return { hasConflict: true, reason: `GV đang dạy lớp ${teacherConflict.classId} tiết này` };
  }

  return { hasConflict: false };
}

// Available subjects that can be assigned
export const availableSubjects = [
  { id: "toan", name: "Toán" },
  { id: "tv", name: "Tiếng Việt" },
  { id: "ta", name: "Tiếng Anh" },
  { id: "gdtc", name: "GDTC" },
  { id: "tin", name: "Tin học" },
  { id: "an", name: "Âm nhạc" },
  { id: "mt", name: "Mĩ thuật" },
  { id: "hdtn", name: "HĐTN" },
  { id: "lsdl", name: "LS&ĐL" },
  { id: "dd", name: "Đạo đức" },
];

export const availableTeachersForSubject: Record<string, { id: string; name: string }[]> = {
  ta: [{ id: "lien", name: "Liên" }],
  gdtc: [{ id: "nghi", name: "Nghị" }],
  tin: [{ id: "thao", name: "Thảo" }],
  an: [{ id: "hai", name: "Hải" }],
  mt: [{ id: "phi-xuan", name: "Phí Xuân" }],
};
