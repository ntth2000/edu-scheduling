// UC09-02 — Thêm giáo viên hợp lệ [Normal]
// Steps: nhập họ tên và định mức rồi lưu -> Expect: giáo viên xuất hiện đúng
// thông tin; form không yêu cầu loại giáo viên hoặc môn dạy.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc09_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const teacherName = `Nguyễn An UC0902 ${Date.now()}`;

  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Thêm giáo viên|Thêm mới/i }).first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const dialogText = await dialog.textContent();
  assert(!/Loại giáo viên|Loại GV/i.test(dialogText), "teacher form must not ask for teacher type");
  assert(!/Môn dạy/i.test(dialogText), "teacher form must not ask for teaching subjects");

  const inputs = dialog.locator("input");
  await inputs.nth(0).fill(teacherName);
  await inputs.nth(1).fill("19");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();

  await page.getByText("Đã thêm giáo viên mới", { exact: true }).waitFor({ timeout: 3000 });
  const row = page.locator("table tbody tr", { hasText: teacherName });
  assert(await row.count() === 1, `expected a row for new teacher "${teacherName}"`);
  const rowText = await row.textContent();
  assert(rowText.includes("19"), `expected weekly limit 19 in row, got "${rowText}"`);

  const teachers = await apiGet("/api/teachers", cookie);
  const saved = teachers.find((teacher) => teacher.fullName === teacherName);
  assert(saved, `expected "${teacherName}" to be persisted`);
  assert(saved.maxPeriodsPerWeek === 19, `expected persisted weekly limit 19, got ${saved.maxPeriodsPerWeek}`);
});
