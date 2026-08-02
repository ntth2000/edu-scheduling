// UC09-05 — Xoá giáo viên chưa có phân công [Normal]
// Steps: chọn giáo viên chưa liên quan dữ liệu, xoá và xác nhận -> Expect:
// giáo viên biến mất khỏi danh sách và backend.
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

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc09_05");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const teacherName = `Giáo viên độc lập UC0905 ${Date.now()}`;
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: teacherName, type: "BO_MON", maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );

  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr", { hasText: teacherName });
  assert(await row.count() === 1, `expected fixture teacher "${teacherName}"`);
  await row.getByRole("button", { name: "Xóa", exact: true }).click();

  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.getByText(/Đã xóa 1 giáo viên/).waitFor({ timeout: 3000 });

  assert(
    await page.locator("table tbody tr", { hasText: teacherName }).count() === 0,
    `expected deleted teacher "${teacherName}" to disappear from table`
  );
  const teachers = await apiGet("/api/teachers", cookie);
  assert(!teachers.some((item) => item.id === teacher.id), "expected deleted teacher to be absent from API");
});
