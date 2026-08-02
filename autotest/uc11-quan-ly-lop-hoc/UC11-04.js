// UC11-04 — Xoá lớp không có dữ liệu liên quan [Normal]
// Steps: chọn lớp chưa có phân công hoặc tiết học -> chọn xoá và xác nhận ->
// Expect: lớp bị xoá khỏi năm học đã chọn.
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
  const { username, password } = await registerTestUser("uc11_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `4D${suffix % 1000000}`, grade: 4, schoolYearId: year.id },
    cookie
  );

  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const row = page.locator("div.group", { hasText: `Lớp ${schoolClass.name}` });
  await row.locator("button").nth(1).click(); // trash = delete

  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Xóa", exact: true }).click();

  await page.getByText(`Đã xóa Lớp ${schoolClass.name}`, { exact: true }).waitFor({ timeout: 3000 });
  assert(
    await page.getByText(`Lớp ${schoolClass.name}`, { exact: true }).count() === 0,
    `expected class row "${schoolClass.name}" to be removed from the page`
  );

  const classes = await apiGet(`/api/classes?year=${encodeURIComponent(year.name)}`, cookie);
  assert(!classes.some((c) => c.id === schoolClass.id), "expected class to be deleted from the API");
});
