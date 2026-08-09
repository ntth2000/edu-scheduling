import { type Slot, DAYS, SESSIONS } from "./timetable-data";
import { type SpecialRoomResponse } from "./api";

/**
 * Kiểm tra 5 ràng buộc bắt buộc ngay trên trình duyệt.
 *
 * Đây là bản sao của `TimetableConstraintProvider.java` phía backend (HC1–HC5). Sở dĩ phải tính
 * lại ở FE vì lưới đang chỉnh sửa còn chứa các tiết chưa lưu (`isDirty`) mà backend không nhìn
 * thấy — muốn hỏi backend thì phải gửi cả bản nháp lên sau mỗi thao tác.
 *
 * KHI SỬA RÀNG BUỘC Ở BACKEND, PHẢI SỬA CẢ Ở ĐÂY. Nếu hai bên lệch nhau, người dùng sẽ thấy lưới
 * báo hợp lệ nhưng vẫn không công khai được tuần (hoặc ngược lại).
 *
 * Quy ước tiết: FE dùng tiết phẳng 1–7; backend dùng tiết trong buổi (sáng 1–4, chiều 1–3).
 * `SESSIONS` trong timetable-data.ts là nơi ánh xạ giữa hai cách đánh số.
 */

export type HardConstraint = "class" | "teacher" | "room" | "gap" | "afternoon";

export interface HardViolation {
  key: string;
  constraint: HardConstraint;
  /** Mô tả hiển thị trong bảng lỗi. */
  label: string;
  /** Các tiết cần làm nổi bật trên lưới. */
  slotIds: string[];
}

const MORNING_PERIODS = SESSIONS[0].periods as readonly number[];
const AFTERNOON_PERIODS = SESSIONS[1].periods as readonly number[];

function dayLabel(day: number): string {
  return DAYS.find((d) => d.value === day)?.label ?? `Thứ ${day}`;
}

/** Dạng chữ của thứ, dùng trong câu văn xuôi: "vào chiều Thứ Ba". */
const DAY_WORDS: Record<number, string> = {
  2: "Thứ Hai",
  3: "Thứ Ba",
  4: "Thứ Tư",
  5: "Thứ Năm",
  6: "Thứ Sáu",
};

function dayWord(day: number): string {
  return DAY_WORDS[day] ?? dayLabel(day);
}

/** Số thứ tự tiết TRONG BUỔI (chiều tiết 6 phẳng → tiết 2), cách người dùng quen đọc. */
function periodInSession(period: number): number {
  const session = SESSIONS.find((s) => (s.periods as readonly number[]).includes(period));
  return session ? period - session.periods[0] + 1 : period;
}

/** "sáng" / "chiều" — viết thường để ghép vào câu. */
function sessionWord(period: number): string {
  const session = SESSIONS.find((s) => (s.periods as readonly number[]).includes(period));
  return session ? session.label.toLowerCase() : "";
}

/** "tiết 2 chiều Thứ Ba" — cụm chỉ thời điểm dùng chung cho mọi thông điệp. */
function at(day: number, period: number): string {
  return `tiết ${periodInSession(period)} ${sessionWord(period)} ${dayWord(day)}`;
}

/** Gom các tiết theo một khoá tuỳ ý. */
function groupBy(slots: Slot[], key: (s: Slot) => string | null): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const k = key(slot);
    if (k === null) continue;
    const list = map.get(k);
    if (list) list.push(slot);
    else map.set(k, [slot]);
  }
  return map;
}

/** HC1 — một lớp không thể có hai tiết trong cùng khung giờ. */
function classConflicts(slots: Slot[]): HardViolation[] {
  const result: HardViolation[] = [];
  for (const [, group] of groupBy(slots, (s) => `${s.classId}|${s.day}|${s.period}`)) {
    if (group.length < 2) continue;
    const first = group[0];
    result.push({
      key: `class-${first.classId}-${first.day}-${first.period}`,
      constraint: "class",
      label:
        `Lớp ${first.classId} bị xếp ${group.length} tiết cùng lúc ` +
        `(${group.map((s) => s.subjectName).join(", ")}) vào ${at(first.day, first.period)}.`,
      slotIds: group.map((s) => s.id),
    });
  }
  return result;
}

/** HC2 — một giáo viên không thể dạy hai lớp trong cùng khung giờ. */
function teacherConflicts(slots: Slot[]): HardViolation[] {
  const result: HardViolation[] = [];
  const grouped = groupBy(slots, (s) => (s.teacherId ? `${s.teacherId}|${s.day}|${s.period}` : null));
  for (const [, group] of grouped) {
    if (group.length < 2) continue;
    const first = group[0];
    result.push({
      key: `teacher-${first.teacherId}-${first.day}-${first.period}`,
      constraint: "teacher",
      label:
        `Giáo viên ${first.teacherName ?? "?"} bị xếp dạy ${group.length} lớp cùng lúc ` +
        `(${group.map((s) => s.classId).join(", ")}) vào ${at(first.day, first.period)}.`,
      slotIds: group.map((s) => s.id),
    });
  }
  return result;
}

/**
 * HC3 — số lớp dùng cùng một phòng chức năng tại một khung giờ không được vượt số phòng hiện có.
 *
 * Phòng được suy ra từ môn học (`SpecialRoom.subjectId`) đúng như `ScheduleGeneratorService` làm,
 * chứ không đọc `slot.specialRoomId` — cột đó hiện luôn rỗng vì lúc lưu tiết FE không gửi lên.
 */
function roomConflicts(slots: Slot[], specialRooms: SpecialRoomResponse[]): HardViolation[] {
  const subjectToRoom = new Map<string, SpecialRoomResponse>();
  for (const room of specialRooms) {
    if (room.subjectId != null) subjectToRoom.set(room.subjectId.toString(), room);
  }
  if (subjectToRoom.size === 0) return [];

  const result: HardViolation[] = [];
  const grouped = groupBy(slots, (s) => {
    const room = subjectToRoom.get(s.subjectId);
    return room ? `${room.id}|${s.day}|${s.period}` : null;
  });
  for (const [key, group] of grouped) {
    const room = subjectToRoom.get(group[0].subjectId);
    if (!room || group.length <= room.quantity) continue;
    const first = group[0];
    result.push({
      key: `room-${key}`,
      constraint: "room",
      label:
        `Phòng ${room.name} chỉ có ${room.quantity} phòng nhưng ${group.length} lớp cùng sử dụng ` +
        `(${group.map((s) => s.classId).join(", ")}) vào ${at(first.day, first.period)}.`,
      slotIds: group.map((s) => s.id),
    });
  }
  return result;
}

/**
 * HC4 — các tiết của một lớp trong cùng buổi phải liên tục TỪ TIẾT ĐẦU BUỔI.
 *
 * Backend phạt mỗi tiết có `period > 1` (trong buổi) mà không có tiết liền trước. Nghĩa là xếp
 * tiết 2-3-4 mà bỏ trống tiết 1 vẫn là vi phạm, chứ không chỉ lỗ hổng ở giữa.
 */
function sessionGaps(slots: Slot[]): HardViolation[] {
  const result: HardViolation[] = [];
  const classNames = [...new Set(slots.map((s) => s.classId))];

  for (const className of classNames) {
    for (const day of DAYS) {
      for (const session of SESSIONS) {
        const periods = session.periods as readonly number[];
        const inSession = slots.filter(
          (s) => s.classId === className && s.day === day.value && periods.includes(s.period)
        );
        if (inSession.length === 0) continue;

        const occupied = new Set(inSession.map((s) => s.period));
        for (const slot of inSession) {
          const isFirstOfSession = slot.period === periods[0];
          if (isFirstOfSession || occupied.has(slot.period - 1)) continue;
          result.push({
            key: `gap-${className}-${day.value}-${slot.period}`,
            constraint: "gap",
            // Trật tự từ khác các thông điệp kia ("vào" nằm giữa tiết và buổi) nên không dùng at().
            label:
              `Lớp ${className} có tiết học không liên tục: ` +
              `tiết ${periodInSession(slot.period - 1)} đang trống trước ` +
              `tiết ${periodInSession(slot.period)} vào ${sessionWord(slot.period)} ${dayWord(day.value)}.`,
            slotIds: [slot.id],
          });
        }
      }
    }
  }
  return result;
}

/** HC5 — lớp chỉ được có tiết buổi chiều khi cả 4 tiết buổi sáng hôm đó đã kín. */
function incompleteMornings(slots: Slot[]): HardViolation[] {
  const result: HardViolation[] = [];
  const classNames = [...new Set(slots.map((s) => s.classId))];

  for (const className of classNames) {
    for (const day of DAYS) {
      const daySlots = slots.filter((s) => s.classId === className && s.day === day.value);
      const afternoon = daySlots.filter((s) => AFTERNOON_PERIODS.includes(s.period));
      if (afternoon.length === 0) continue;

      const morningFilled = new Set(
        daySlots.filter((s) => MORNING_PERIODS.includes(s.period)).map((s) => s.period)
      ).size;
      if (morningFilled >= MORNING_PERIODS.length) continue;

      result.push({
        key: `afternoon-${className}-${day.value}`,
        constraint: "afternoon",
        label:
          `Lớp ${className} có tiết buổi chiều nhưng buổi sáng mới xếp ` +
          `${morningFilled}/${MORNING_PERIODS.length} tiết vào ${dayWord(day.value)}.`,
        slotIds: afternoon.map((s) => s.id),
      });
    }
  }
  return result;
}

/** Toàn bộ vi phạm ràng buộc bắt buộc của lưới hiện tại, tính cả các tiết chưa lưu. */
export function findHardViolations(
  slots: Slot[],
  specialRooms: SpecialRoomResponse[]
): HardViolation[] {
  return [
    ...classConflicts(slots),
    ...teacherConflicts(slots),
    ...roomConflicts(slots, specialRooms),
    ...sessionGaps(slots),
    ...incompleteMornings(slots),
  ];
}

/** Tra cứu nhanh: mỗi tiết đang dính những ràng buộc nào (để tô màu ô trên lưới). */
export function violationsBySlotId(violations: HardViolation[]): Map<string, HardConstraint[]> {
  const map = new Map<string, HardConstraint[]>();
  for (const v of violations) {
    for (const id of v.slotIds) {
      const list = map.get(id);
      if (list) {
        if (!list.includes(v.constraint)) list.push(v.constraint);
      } else {
        map.set(id, [v.constraint]);
      }
    }
  }
  return map;
}
