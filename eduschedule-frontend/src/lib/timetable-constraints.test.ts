import { describe, it, expect } from "vitest";
import { findHardViolations, violationsBySlotId } from "./timetable-constraints";
import type { Slot } from "./timetable-data";
import type { SpecialRoomResponse } from "./api";

let nextId = 0;

function slot(partial: Partial<Slot> & Pick<Slot, "day" | "period" | "classId">): Slot {
  return {
    id: `s${nextId++}`,
    subjectId: "1",
    subjectName: "Toán",
    teacherId: null,
    teacherName: null,
    isConflict: false,
    ...partial,
  };
}

/** Lấp kín 4 tiết sáng của một lớp trong một ngày. */
function fullMorning(classId: string, day: number): Slot[] {
  return [1, 2, 3, 4].map((period) => slot({ classId, day, period }));
}

function kinds(slots: Slot[], rooms: SpecialRoomResponse[] = []) {
  return findHardViolations(slots, rooms).map((v) => v.constraint).sort();
}

function labelOf(slots: Slot[], rooms: SpecialRoomResponse[] = []) {
  return findHardViolations(slots, rooms)[0]?.label;
}

describe("HC1 — một lớp không có hai tiết cùng khung giờ", () => {
  it("phát hiện hai tiết của cùng lớp ở cùng thứ/tiết", () => {
    const slots = [
      slot({ classId: "4A", day: 2, period: 1 }),
      slot({ classId: "4A", day: 2, period: 1, subjectId: "2", subjectName: "Văn" }),
    ];
    expect(kinds(slots)).toContain("class");
  });

  it("không báo khi hai lớp khác nhau học cùng khung giờ", () => {
    const slots = [
      slot({ classId: "4A", day: 2, period: 1 }),
      slot({ classId: "4B", day: 2, period: 1 }),
    ];
    expect(kinds(slots)).toEqual([]);
  });
});

describe("HC2 — giáo viên không dạy hai lớp cùng lúc", () => {
  it("phát hiện giáo viên trùng lịch giữa hai lớp", () => {
    const slots = [
      slot({ classId: "4A", day: 2, period: 1, teacherId: "7", teacherName: "Liên" }),
      slot({ classId: "4B", day: 2, period: 1, teacherId: "7", teacherName: "Liên" }),
    ];
    expect(kinds(slots)).toContain("teacher");
  });

  it("bỏ qua tiết không có giáo viên (GVCN tự dạy)", () => {
    const slots = [
      slot({ classId: "4A", day: 2, period: 1 }),
      slot({ classId: "4B", day: 2, period: 1 }),
    ];
    expect(kinds(slots)).toEqual([]);
  });
});

describe("HC3 — phòng chức năng không vượt sức chứa", () => {
  const room: SpecialRoomResponse = {
    id: 1,
    name: "Phòng máy",
    subjectId: 9,
    quantity: 1,
  } as SpecialRoomResponse;

  it("phát hiện khi số lớp dùng phòng vượt số phòng hiện có", () => {
    const slots = [
      slot({ classId: "4A", day: 2, period: 1, subjectId: "9", subjectName: "Tin học" }),
      slot({ classId: "4B", day: 2, period: 1, subjectId: "9", subjectName: "Tin học" }),
    ];
    expect(kinds(slots, [room])).toContain("room");
  });

  it("không báo khi số lớp vẫn trong sức chứa", () => {
    const twoRooms = { ...room, quantity: 2 };
    const slots = [
      slot({ classId: "4A", day: 2, period: 1, subjectId: "9", subjectName: "Tin học" }),
      slot({ classId: "4B", day: 2, period: 1, subjectId: "9", subjectName: "Tin học" }),
    ];
    expect(kinds(slots, [twoRooms])).toEqual([]);
  });
});

describe("HC4 — tiết trong buổi phải liên tục từ tiết đầu buổi", () => {
  it("báo lỗi khi buổi sáng bắt đầu từ tiết 2 (bỏ trống tiết 1)", () => {
    const slots = [2, 3, 4].map((period) => slot({ classId: "4A", day: 2, period }));
    expect(kinds(slots)).toContain("gap");
  });

  it("không báo khi buổi sáng liên tục từ tiết 1", () => {
    expect(kinds(fullMorning("4A", 2))).toEqual([]);
  });

  it("báo lỗi khi có lỗ hổng giữa buổi", () => {
    const slots = [1, 2, 4].map((period) => slot({ classId: "4A", day: 2, period }));
    expect(kinds(slots)).toContain("gap");
  });

  it("tiết 5 là tiết đầu buổi chiều nên không cần tiết 4 liền trước", () => {
    // Sáng đủ 4 tiết để không vướng HC5; chiều chỉ có tiết 5 (tiết đầu buổi).
    const slots = [...fullMorning("4A", 2), slot({ classId: "4A", day: 2, period: 5 })];
    expect(kinds(slots)).toEqual([]);
  });

  it("báo lỗi khi buổi chiều bắt đầu từ tiết 6 (bỏ trống tiết 5)", () => {
    const slots = [...fullMorning("4A", 2), slot({ classId: "4A", day: 2, period: 6 })];
    expect(kinds(slots)).toContain("gap");
  });

  it("diễn đạt theo tiết trong buổi và thứ dạng chữ", () => {
    // Thứ Ba (day 3), chiều: tiết 6 phẳng = chiều tiết 2, thiếu tiết 5 phẳng = chiều tiết 1.
    const slots = [...fullMorning("3D", 3), slot({ classId: "3D", day: 3, period: 6 })];
    const gap = findHardViolations(slots, []).find((v) => v.constraint === "gap");
    expect(gap?.label).toBe(
      "Lớp 3D có tiết học không liên tục: tiết 1 đang trống trước tiết 2 vào chiều Thứ Ba."
    );
  });

  it("diễn đạt đúng cho buổi sáng", () => {
    const slots = [1, 2, 4].map((period) => slot({ classId: "3D", day: 5, period }));
    const gap = findHardViolations(slots, []).find((v) => v.constraint === "gap");
    expect(gap?.label).toBe(
      "Lớp 3D có tiết học không liên tục: tiết 3 đang trống trước tiết 4 vào sáng Thứ Năm."
    );
  });
});

describe("HC5 — có tiết chiều thì buổi sáng phải đủ 4 tiết", () => {
  it("báo lỗi khi xếp tiết chiều mà sáng mới có 3 tiết", () => {
    const slots = [
      ...[1, 2, 3].map((period) => slot({ classId: "4A", day: 2, period })),
      slot({ classId: "4A", day: 2, period: 5 }),
    ];
    expect(kinds(slots)).toContain("afternoon");
  });

  it("không báo khi buổi sáng đã đủ 4 tiết", () => {
    const slots = [...fullMorning("4A", 2), slot({ classId: "4A", day: 2, period: 5 })];
    expect(kinds(slots)).not.toContain("afternoon");
  });

  it("không báo khi lớp chỉ học buổi sáng và chưa đủ 4 tiết", () => {
    const slots = [1, 2].map((period) => slot({ classId: "4A", day: 2, period }));
    expect(kinds(slots)).toEqual([]);
  });
});

describe("văn phong thông điệp — tiết trong buổi, thứ dạng chữ, kết thúc bằng dấu chấm", () => {
  it("HC1 lớp trùng tiết", () => {
    const slots = [
      slot({ classId: "3D", day: 3, period: 6, subjectName: "Toán" }),
      slot({ classId: "3D", day: 3, period: 6, subjectId: "2", subjectName: "Tiếng Việt" }),
    ];
    expect(labelOf(slots)).toBe(
      "Lớp 3D bị xếp 2 tiết cùng lúc (Toán, Tiếng Việt) vào tiết 2 chiều Thứ Ba."
    );
  });

  it("HC2 giáo viên trùng lịch", () => {
    const slots = [
      slot({ classId: "3D", day: 4, period: 2, teacherId: "7", teacherName: "Liên" }),
      slot({ classId: "3E", day: 4, period: 2, teacherId: "7", teacherName: "Liên" }),
    ];
    expect(labelOf(slots)).toBe(
      "Giáo viên Liên bị xếp dạy 2 lớp cùng lúc (3D, 3E) vào tiết 2 sáng Thứ Tư."
    );
  });

  it("HC3 phòng chức năng vượt sức chứa", () => {
    const room = { id: 1, name: "Tin học", subjectId: 9, quantity: 1 } as SpecialRoomResponse;
    const slots = [
      slot({ classId: "3D", day: 6, period: 1, subjectId: "9", subjectName: "Tin học" }),
      slot({ classId: "3E", day: 6, period: 1, subjectId: "9", subjectName: "Tin học" }),
    ];
    expect(labelOf(slots, [room])).toBe(
      "Phòng Tin học chỉ có 1 phòng nhưng 2 lớp cùng sử dụng (3D, 3E) vào tiết 1 sáng Thứ Sáu."
    );
  });

  it("HC5 có tiết chiều khi sáng chưa đủ", () => {
    const slots = [
      ...[1, 2, 3].map((period) => slot({ classId: "3D", day: 2, period })),
      slot({ classId: "3D", day: 2, period: 5 }),
    ];
    const afternoon = findHardViolations(slots, []).find((v) => v.constraint === "afternoon");
    expect(afternoon?.label).toBe(
      "Lớp 3D có tiết buổi chiều nhưng buổi sáng mới xếp 3/4 tiết vào Thứ Hai."
    );
  });
});

describe("violationsBySlotId", () => {
  it("gom được nhiều loại vi phạm trên cùng một tiết", () => {
    const shared = slot({ classId: "4A", day: 2, period: 2, teacherId: "7", teacherName: "Liên" });
    const slots = [
      shared,
      // cùng lớp, cùng khung giờ -> HC1; cùng GV, cùng khung giờ ở lớp khác -> HC2
      slot({ classId: "4A", day: 2, period: 2, subjectId: "2" }),
      slot({ classId: "4B", day: 2, period: 2, teacherId: "7", teacherName: "Liên" }),
    ];
    const map = violationsBySlotId(findHardViolations(slots, []));
    expect(map.get(shared.id)).toEqual(expect.arrayContaining(["class", "teacher"]));
  });
});
