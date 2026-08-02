// UC09-03 — Cập nhật giáo viên [Normal]
// Steps: sửa họ tên/định mức rồi lưu -> Expect: danh sách và API hiện đúng
// dữ liệu mới; form không có loại giáo viên hoặc môn dạy.
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
  const { username, password } = await registerTestUser("uc09_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const originalName = `Giáo viên cũ UC0903 ${Date.now()}`;
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: originalName, type: "BO_MON", maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const updatedName = `Giáo viên mới UC0903 ${Date.now()}`;

  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  const originalRow = page.locator("table tbody tr", { hasText: originalName });
  assert(await originalRow.count() === 1, `expected fixture teacher "${originalName}"`);
  await originalRow.getByRole("button", { name: "Chỉnh sửa" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const dialogText = await dialog.textContent();
  assert(!/Loại giáo viên|Loại GV/i.test(dialogText), "edit form must not contain teacher type");
  assert(!/Môn dạy/i.test(dialogText), "edit form must not contain teaching subjects");

  const inputs = dialog.locator("input");
  await inputs.nth(0).fill(updatedName);
  await inputs.nth(1).fill("17");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();

  await page.getByText("Đã cập nhật thông tin giáo viên", { exact: true }).waitFor({ timeout: 3000 });
  assert(
    await page.locator("table tbody tr", { hasText: originalName }).count() === 0,
    `expected old name "${originalName}" to disappear`
  );
  const updatedRow = page.locator("table tbody tr", { hasText: updatedName });
  assert(await updatedRow.count() === 1, `expected updated row "${updatedName}"`);
  const rowText = await updatedRow.textContent();
  assert(rowText.includes("17"), `expected updated weekly limit 17, got "${rowText}"`);

  const teachers = await apiGet("/api/teachers", cookie);
  const persisted = teachers.find((item) => item.id === teacher.id);
  assert(persisted?.fullName === updatedName, "expected updated name to be persisted");
  assert(persisted?.maxPeriodsPerWeek === 17, "expected updated weekly limit to be persisted");
});
