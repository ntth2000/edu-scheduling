import * as XLSX from "xlsx";
import { type Slot, DAYS, PERIODS } from "./timetable-data";
import { type ClassResponse } from "./api";

const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];

type AoaRow = (string | null)[];

/** Build a 7-row grid (one row per period), each cell = subject + optional note */
function buildPeriodRows(
  getCell: (day: number, period: number) => string
): AoaRow[] {
  return PERIODS.map((period) => [
    String(period),
    ...DAYS.map((day) => getCell(day.value, period)),
  ]);
}

/** Apply common styles: column widths, row heights for wrap */
function applySheetLayout(ws: XLSX.WorkSheet, dataRowCount: number) {
  ws["!cols"] = [{ wch: 6 }, ...DAY_LABELS.map(() => ({ wch: 22 }))];
  // Set row height for data rows so wrapped text is visible
  const rows: XLSX.RowInfo[] = [];
  for (let i = 0; i < dataRowCount + 4; i++) {
    rows.push({ hpt: i >= 3 ? 42 : 18 });
  }
  ws["!rows"] = rows;
}

/** Merge title row across all 6 columns (Tiết + 5 days) */
function mergeTitleRows(ws: XLSX.WorkSheet, titleRowCount: number) {
  if (!ws["!merges"]) ws["!merges"] = [];
  for (let r = 0; r < titleRowCount; r++) {
    ws["!merges"].push({ s: { r, c: 0 }, e: { r, c: 5 } });
  }
}

export function exportClassTimetable(
  slots: Slot[],
  className: string,
  homeroomTeacherName?: string | null
) {
  const wb = XLSX.utils.book_new();

  const aoa: AoaRow[] = [
    [`THỜI KHOÁ BIỂU LỚP ${className}`],
    [homeroomTeacherName ? `GVCN: ${homeroomTeacherName}` : ""],
    [""],
    ["Tiết", ...DAY_LABELS],
    ...buildPeriodRows((day, period) => {
      const slot = slots.find(
        (s) => s.classId === className && s.day === day && s.period === period
      );
      if (!slot) return "";
      return slot.teacherName
        ? `${slot.subjectName}\n(${slot.teacherName})`
        : slot.subjectName;
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  mergeTitleRows(ws, 3);
  applySheetLayout(ws, PERIODS.length);

  const sheetName = `Lop ${className}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `TKB_Lop_${className}.xlsx`);
}

export function exportTeacherTimetable(
  slots: Slot[],
  teacherId: string,
  teacherName: string
) {
  const wb = XLSX.utils.book_new();
  const teacherSlots = slots.filter((s) => s.teacherId === teacherId);

  const aoa: AoaRow[] = [
    [`THỜI KHOÁ BIỂU GIÁO VIÊN ${teacherName.toUpperCase()}`],
    [""],
    [""],
    ["Tiết", ...DAY_LABELS],
    ...buildPeriodRows((day, period) => {
      const slot = teacherSlots.find(
        (s) => s.day === day && s.period === period
      );
      if (!slot) return "";
      return `${slot.subjectName}\nLớp ${slot.classId}`;
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  mergeTitleRows(ws, 3);
  applySheetLayout(ws, PERIODS.length);

  const safeName = teacherName.replace(/[^\w\s]/gi, "").trim().slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName || "GiaoVien");
  XLSX.writeFile(wb, `TKB_GV_${teacherName.replace(/\s+/g, "_")}.xlsx`);
}

export function exportGradeTimetable(
  slots: Slot[],
  grade: number,
  classes: ClassResponse[]
) {
  const wb = XLSX.utils.book_new();
  const gradeClasses = [...classes]
    .filter((c) => c.grade === grade)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  for (const cls of gradeClasses) {
    const aoa: AoaRow[] = [
      [`THỜI KHOÁ BIỂU LỚP ${cls.name}`],
      [cls.homeroomTeacherName ? `GVCN: ${cls.homeroomTeacherName}` : ""],
      [""],
      ["Tiết", ...DAY_LABELS],
      ...buildPeriodRows((day, period) => {
        const slot = slots.find(
          (s) =>
            s.classId === cls.name && s.day === day && s.period === period
        );
        if (!slot) return "";
        return slot.teacherName
          ? `${slot.subjectName}\n(${slot.teacherName})`
          : slot.subjectName;
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    mergeTitleRows(ws, 3);
    applySheetLayout(ws, PERIODS.length);

    const sheetName = `Lop ${cls.name}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `TKB_Khoi_${grade}.xlsx`);
}
