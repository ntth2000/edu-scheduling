// UC04-02 — Thay thế tiết đã có [Normal]
// Steps: chọn một ô đã có tiết học -> chọn môn học khác hợp lệ để thay thế
// -> lưu tuần -> Expect: môn mới thay thế môn cũ tại đúng ô; các ràng buộc
// được kiểm tra lại; dữ liệu được lưu.
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
  return rows.nth(period).locator("> div").nth(dayIndex + 1);
}

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc04_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán");
  const tiengViet = subjects.find((s) => s.name === "Tiếng Việt");
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1B${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0402 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  await apiPost("/api/assignments", { classId: schoolClass.id, subjectId: toan.id, teacherId: teacher.id }, cookie);
  await apiPost("/api/assignments", { classId: schoolClass.id, subjectId: tiengViet.id, teacherId: teacher.id }, cookie);

  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  const existingSlot = await apiPost(
    "/api/slots",
    { weekId: week1.id, classId: schoolClass.id, subjectId: toan.id, day: 2, session: 1, period: 1 },
    cookie
  );

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();

  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  const cell = cellLocator(overlay, 2, 1);
  await cell.click();

  const infoPopover = page.locator('[data-slot="popover-content"]').last();
  await infoPopover.waitFor();
  await infoPopover.getByRole("button", { name: "Đổi môn" }).click();

  const picker = page.locator('[data-slot="popover-content"]').last();
  await picker.getByText("Đổi môn học", { exact: true }).waitFor();
  await picker.getByRole("button", { name: new RegExp(`^${tiengViet.name}`) }).click();

  await page.getByText(`Đã xếp ${tiengViet.name}`, { exact: true }).waitFor({ timeout: 3000 });
  let cellText = await cell.textContent();
  assert(cellText.includes(tiengViet.name) && !cellText.includes(toan.name), `expected cell to show "${tiengViet.name}" and not "${toan.name}", got "${cellText}"`);

  await overlay.getByRole("button", { name: /^Lưu tuần/ }).click();
  await page.getByText("Đã lưu 2 thay đổi", { exact: true }).waitFor({ timeout: 3000 });

  cellText = await cell.textContent();
  assert(cellText.includes(tiengViet.name) && !cellText.includes("Chưa lưu"), `expected saved cell to show "${tiengViet.name}", got "${cellText}"`);

  const slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  const atCell = slots.filter((s) => s.day === 2 && s.period === 1 && s.classId === schoolClass.id);
  assert(atCell.length === 1, `expected exactly one slot at this cell, found ${atCell.length}`);
  assert(atCell[0].subjectId === tiengViet.id, `expected subjectId ${tiengViet.id}, got ${atCell[0].subjectId}`);
  assert(!slots.some((s) => s.id === existingSlot.id), "expected the original Toán slot row to be gone (replaced, not duplicated)");
});
