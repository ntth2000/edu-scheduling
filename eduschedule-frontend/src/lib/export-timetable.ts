import ExcelJS from "exceljs";
import { type Slot, DAYS, PERIODS } from "./timetable-data";
import { type ClassResponse } from "./api";

const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
const FONT_NAME = "Times New Roman";
const THIN_BLACK_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF000000" } },
  left: { style: "thin", color: { argb: "FF000000" } },
  bottom: { style: "thin", color: { argb: "FF000000" } },
  right: { style: "thin", color: { argb: "FF000000" } },
};

export interface TimetableExportMeta {
  weekNumber: number;
  semesterOrder: number;
  schoolYearName: string;
  startDate?: string | null;
  endDate?: string | null;
}

function formatDate(d: string): string {
  return `${parseInt(d.slice(8, 10))}/${parseInt(d.slice(5, 7))}`;
}

function metaLine(meta: TimetableExportMeta): string {
  const dateRange = meta.startDate && meta.endDate
    ? ` (${formatDate(meta.startDate)} - ${formatDate(meta.endDate)})`
    : "";
  return `Tuần ${meta.weekNumber}${dateRange} - Học kì ${meta.semesterOrder} - Năm học ${meta.schoolYearName}`;
}

// e.g. "TKB_Khoi 1_Tuan 3_HK1_Nam hoc 2026-2027.xlsx" / "TKB_Lop 1A_Tuan 3_HK1_Nam hoc 2026-2027.xlsx"
function buildFileName(kindLabel: string, kindValue: string, meta: TimetableExportMeta): string {
  return `TKB_${kindLabel} ${kindValue}_Tuan ${meta.weekNumber}_HK${meta.semesterOrder}_Nam hoc ${meta.schoolYearName}.xlsx`;
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Builds one timetable grid sheet: title lines + "Tiết" header row + one row per period. */
function buildTimetableSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  titleLines: string[],
  getCell: (day: number, period: number) => string
) {
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: false }],
  });

  worksheet.getColumn(1).width = 8;
  for (let c = 2; c <= 6; c++) worksheet.getColumn(c).width = 24;

  let rowIndex = 1;
  titleLines.forEach((line, i) => {
    const row = worksheet.getRow(rowIndex);
    row.height = 20;
    worksheet.mergeCells(rowIndex, 1, rowIndex, 6);
    const cell = row.getCell(1);
    cell.value = line;
    cell.font = { name: FONT_NAME, bold: i === 0, size: i === 0 ? 14 : 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    rowIndex++;
  });
  rowIndex++; // blank spacer row

  const headerRow = worksheet.getRow(rowIndex);
  headerRow.height = 20;
  ["Tiết", ...DAY_LABELS].forEach((label, c) => {
    const cell = headerRow.getCell(c + 1);
    cell.value = label;
    cell.font = { name: FONT_NAME, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = THIN_BLACK_BORDER;
  });
  rowIndex++;

  for (const period of PERIODS) {
    const row = worksheet.getRow(rowIndex);
    row.height = 42;

    const periodCell = row.getCell(1);
    periodCell.value = period;
    periodCell.font = { name: FONT_NAME, bold: true };
    periodCell.alignment = { horizontal: "center", vertical: "middle" };
    periodCell.border = THIN_BLACK_BORDER;

    DAYS.forEach((day, i) => {
      const content = getCell(day.value, period);
      const cell = row.getCell(i + 2);
      cell.value = content;
      cell.font = { name: FONT_NAME };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = THIN_BLACK_BORDER;
    });
    rowIndex++;
  }
}

export async function exportClassTimetable(
  slots: Slot[],
  className: string,
  meta: TimetableExportMeta,
  homeroomTeacherName?: string | null
) {
  const workbook = new ExcelJS.Workbook();
  const titleLines = [
    `THỜI KHOÁ BIỂU LỚP ${className}`,
    metaLine(meta),
    homeroomTeacherName ? `GVCN: ${homeroomTeacherName}` : "",
  ];

  buildTimetableSheet(workbook, `Lop ${className}`.slice(0, 31), titleLines, (day, period) => {
    const slot = slots.find((s) => s.classId === className && s.day === day && s.period === period);
    if (!slot) return "";
    return slot.teacherName ? `${slot.subjectName}\n(${slot.teacherName})` : slot.subjectName;
  });

  await downloadWorkbook(workbook, buildFileName("Lop", className, meta));
}

export async function exportTeacherTimetable(
  slots: Slot[],
  teacherId: string,
  teacherName: string,
  meta: TimetableExportMeta
) {
  const workbook = new ExcelJS.Workbook();
  const teacherSlots = slots.filter((s) => s.teacherId === teacherId);
  const titleLines = [`THỜI KHOÁ BIỂU GIÁO VIÊN ${teacherName.toUpperCase()}`, metaLine(meta)];

  buildTimetableSheet(workbook, teacherName.replace(/[^\w\s]/gi, "").trim().slice(0, 31) || "GiaoVien", titleLines, (day, period) => {
    const slot = teacherSlots.find((s) => s.day === day && s.period === period);
    if (!slot) return "";
    return `${slot.subjectName}\nLớp ${slot.classId}`;
  });

  await downloadWorkbook(workbook, buildFileName("GV", teacherName, meta));
}

export async function exportGradeTimetable(
  slots: Slot[],
  grade: number,
  classes: ClassResponse[],
  meta: TimetableExportMeta
) {
  const workbook = new ExcelJS.Workbook();
  const gradeClasses = [...classes].filter((c) => c.grade === grade).sort((a, b) => a.name.localeCompare(b.name, "vi"));

  for (const cls of gradeClasses) {
    const titleLines = [
      `THỜI KHOÁ BIỂU LỚP ${cls.name}`,
      metaLine(meta),
      cls.homeroomTeacherName ? `GVCN: ${cls.homeroomTeacherName}` : "",
    ];

    buildTimetableSheet(workbook, `Lop ${cls.name}`.slice(0, 31), titleLines, (day, period) => {
      const slot = slots.find((s) => s.classId === cls.name && s.day === day && s.period === period);
      if (!slot) return "";
      return slot.teacherName ? `${slot.subjectName}\n(${slot.teacherName})` : slot.subjectName;
    });
  }

  await downloadWorkbook(workbook, buildFileName("Khoi", String(grade), meta));
}
