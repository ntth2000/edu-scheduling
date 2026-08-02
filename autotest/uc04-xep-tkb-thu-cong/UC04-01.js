// UC04-01 — Xếp môn vào ô trống và lưu tuần [Normal]
// Steps: mở Thời khoá biểu -> chọn năm học, học kỳ và tuần -> chọn lớp và
// một ô trống -> chọn môn còn thiếu tiết và đã có giáo viên -> nhấn
// "Lưu tuần N" -> Expect: tiết học xuất hiện ở trạng thái chưa lưu trước
// khi nhấn lưu; sau khi lưu, dữ liệu được lưu cho đúng tuần và vẫn hiển thị
// khi tải lại.
//
// Cells have no day/period DOM attributes, so they're located positionally:
// TimetableGrid renders a header row + one row per period (both carry an
// inline `grid-template-columns` style), each row has 6 direct children
// (period label + one cell per weekday Thứ2..Thứ6).
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

function cellLocator(overlay, day, period) {
  const dayIndex = [2, 3, 4, 5, 6].indexOf(day);
  const rows = overlay.locator('[style*="grid-template-columns"]');
  return rows.nth(period).locator("> div").nth(dayIndex + 1); // row 0 = header
}

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc04_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán"); // periodsGrade1 = 3
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1A${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0401 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  await apiPost("/api/assignments", { classId: schoolClass.id, subjectId: toan.id, teacherId: teacher.id }, cookie);
  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();

  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  const cell = cellLocator(overlay, 2, 1); // Thứ 2, Tiết 1
  await cell.click();

  const popover = page.locator('[data-slot="popover-content"]').last();
  await popover.waitFor();
  const toanOption = popover.getByRole("button", { name: new RegExp(`^${toan.name}`) });
  await toanOption.click();

  await page.getByText(`Đã xếp ${toan.name}`, { exact: true }).waitFor({ timeout: 3000 });
  let cellText = await cell.textContent();
  assert(cellText.includes(toan.name) && cellText.includes("Chưa lưu"), `expected cell to show "${toan.name}" with "Chưa lưu" before saving, got "${cellText}"`);

  await overlay.getByRole("button", { name: /^Lưu tuần/ }).click();
  await page.getByText("Đã lưu 1 thay đổi", { exact: true }).waitFor({ timeout: 3000 });

  cellText = await cell.textContent();
  assert(cellText.includes(toan.name) && !cellText.includes("Chưa lưu"), `expected cell to show "${toan.name}" without "Chưa lưu" after saving, got "${cellText}"`);

  // Reload and confirm the slot is still there.
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();
  const overlay2 = page.locator("div.fixed.inset-0.z-9999");
  await overlay2.waitFor();
  await overlay2.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });
  const cellAfterReload = cellLocator(overlay2, 2, 1);
  const textAfterReload = await cellAfterReload.textContent();
  assert(textAfterReload.includes(toan.name), `expected "${toan.name}" to persist after reload, got "${textAfterReload}"`);

  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  const slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  const saved = slots.find((s) => s.day === 2 && s.period === 1 && s.classId === schoolClass.id);
  assert(saved && saved.subjectId === toan.id, `expected the slot to be persisted for week 1 with subjectId ${toan.id}`);
});
