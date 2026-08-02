// UC04-03 — Loại bỏ tiết đã có [Normal]
// Steps: chọn một ô đã có tiết học -> chọn thao tác loại bỏ tiết -> lưu
// tuần -> Expect: tiết bị loại khỏi lưới và khỏi dữ liệu tuần sau khi lưu.
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
  const { username, password } = await registerTestUser("uc04_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán");
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1C${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0403 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  await apiPost("/api/assignments", { classId: schoolClass.id, subjectId: toan.id, teacherId: teacher.id }, cookie);

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
  await infoPopover.getByRole("button", { name: "Xóa", exact: true }).click();

  await page.getByText(`Đã xóa ${toan.name}`, { exact: true }).waitFor({ timeout: 3000 });
  let cellText = (await cell.textContent()).trim();
  assert(cellText === "", `expected the cell to be empty right after removal, got "${cellText}"`);

  await overlay.getByRole("button", { name: /^Lưu tuần/ }).click();
  await page.getByText("Đã lưu 1 thay đổi", { exact: true }).waitFor({ timeout: 3000 });

  cellText = (await cell.textContent()).trim();
  assert(cellText === "", `expected the cell to remain empty after saving, got "${cellText}"`);

  const slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(!slots.some((s) => s.id === existingSlot.id), "expected the slot to be deleted from the week's data");
});
