// UC11-03 — Cập nhật lớp hợp lệ [Normal]
// Steps: chọn một lớp -> thay đổi tên hoặc khối bằng dữ liệu hợp lệ -> lưu ->
// Expect: thông tin lớp được cập nhật và danh sách phản ánh dữ liệu mới.
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
  const { username, password } = await registerTestUser("uc11_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1U${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const newName = `2U${suffix % 1000000}`;
  const newGrade = 2;

  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const row = page.locator("div.group", { hasText: `Lớp ${schoolClass.name}` });
  await row.locator("button").nth(0).click(); // pencil = edit

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator("input").fill(newName);
  await dialog.getByRole("combobox").first().click(); // Khối select
  await page.getByRole("option", { name: `Khối ${newGrade}`, exact: true }).click();
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();

  await page.getByText("Đã cập nhật thông tin lớp học", { exact: true }).waitFor({ timeout: 3000 });
  assert(
    await page.getByText(`Lớp ${schoolClass.name}`, { exact: true }).count() === 0,
    `expected old name "${schoolClass.name}" to be gone from the list`
  );
  assert(
    await page.getByText(`Lớp ${newName}`, { exact: true }).count() === 1,
    `expected updated name "${newName}" to appear in the Khối ${newGrade} card`
  );

  const updated = await apiGet(`/api/classes/${schoolClass.id}`, cookie);
  assert(updated.name === newName, `expected persisted name "${newName}", got "${updated.name}"`);
  assert(updated.grade === newGrade, `expected persisted grade ${newGrade}, got ${updated.grade}`);
});
