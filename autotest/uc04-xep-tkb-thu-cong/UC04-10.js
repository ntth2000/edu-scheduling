// UC04-10 — Thay đổi chưa lưu khi chuyển tuần [Abnormal]
// Steps: thực hiện một thay đổi trên lưới nhưng chưa lưu -> chuyển sang
// tuần khác -> chọn huỷ việc rời tuần -> Expect: hệ thống cảnh báo có thay
// đổi chưa lưu; khi chọn ở lại, các thay đổi chưa lưu vẫn được giữ trên
// giao diện.
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
  const { username, password } = await registerTestUser("uc04_10");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán");
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1M${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0410 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  await apiPost("/api/assignments", { classId: schoolClass.id, subjectId: toan.id, teacherId: teacher.id }, cookie);

  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  const week2 = weeks.find((w) => w.weekNumber === 2);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();

  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  const cell = cellLocator(overlay, 2, 1);
  await cell.click();
  const popover = page.locator('[data-slot="popover-content"]').last();
  await popover.waitFor();
  await popover.getByRole("button", { name: new RegExp(`^${toan.name}`) }).click();
  await page.getByText(`Đã xếp ${toan.name}`, { exact: true }).waitFor({ timeout: 3000 });

  // Switch week without saving. Weeks have no startDate here, so the
  // dropdown label is "Tuần N (chưa có ngày)" per TimetablePage's weekDropdown.
  await overlay.locator("select").nth(2).selectOption({ label: `Tuần ${week2.weekNumber} (chưa có ngày)` });

  const warnDialog = page.getByRole("alertdialog", { name: "Bạn có thay đổi chưa lưu" });
  await warnDialog.waitFor({ timeout: 3000 });
  assert(
    (await warnDialog.textContent()).includes("Chuyển tuần sẽ huỷ 1 thay đổi chưa lưu"),
    "expected the warning dialog to mention the pending unsaved change"
  );

  await warnDialog.getByRole("button", { name: "Ở lại", exact: true }).click();
  await page.waitForTimeout(300);

  // Still on week 1, and the unsaved slot must still be there.
  const weekSelectValue = await overlay.locator("select").nth(2).inputValue();
  assert(weekSelectValue === String(week1.id), `expected to still be on week 1 (id ${week1.id}), got select value "${weekSelectValue}"`);
  const cellText = await cell.textContent();
  assert(cellText.includes(toan.name) && cellText.includes("Chưa lưu"), `expected the unsaved slot to remain in the grid, got "${cellText}"`);

  const slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(slots.length === 0, "expected nothing to have been persisted to the backend yet");
});
