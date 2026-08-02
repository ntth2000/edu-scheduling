// UC04-04 — Áp dụng từ tuần hiện tại trở đi [Normal]
// Steps: chỉnh sửa thời khoá biểu của tuần N -> chọn "Áp dụng từ tuần N trở
// đi" -> xác nhận thao tác -> Expect: thay đổi được lưu cho tuần N và áp
// dụng cho các tuần tiếp theo trong phạm vi tương ứng; giao diện cập nhật.
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
  const { username, password } = await registerTestUser("uc04_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán");
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1D${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0404 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
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

  await overlay.getByRole("button", { name: /^Áp dụng từ tuần/ }).click();
  const confirmDialog = page.getByRole("alertdialog");
  await confirmDialog.waitFor();
  await confirmDialog.getByRole("button", { name: "Xác nhận áp dụng", exact: true }).click();

  await page.getByText(`Đã áp dụng TKB từ tuần ${week1.weekNumber} trở đi`, { exact: true }).waitFor({ timeout: 5000 });
  const cellText = await cell.textContent();
  assert(cellText.includes(toan.name) && !cellText.includes("Chưa lưu"), `expected week 1's cell to show saved "${toan.name}", got "${cellText}"`);

  const week1Slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(
    week1Slots.some((s) => s.day === 2 && s.period === 1 && s.classId === schoolClass.id && s.subjectId === toan.id),
    "expected week 1 to have the new slot persisted"
  );
  const week2Slots = await apiGet(`/api/slots?weekId=${week2.id}`, cookie);
  assert(
    week2Slots.some((s) => s.day === 2 && s.period === 1 && s.classId === schoolClass.id && s.subjectId === toan.id),
    "expected week 2 (a following week) to have received the same slot via apply-forward"
  );
});
