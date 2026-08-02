// UC11-02 — Thêm lớp hợp lệ [Normal]
// Steps: chọn thêm lớp -> nhập tên lớp chưa tồn tại trong năm học -> chọn
// khối hợp lệ -> xác nhận lưu -> Expect: lớp được lưu đúng năm học và xuất
// hiện trong danh sách.
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
  const { username, password } = await registerTestUser("uc11_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const name = `3X${suffix % 1000000}`;
  const grade = 3;

  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Thêm vào Khối ${grade}` }).click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator("input").fill(name);
  await dialog.getByRole("button", { name: "Tạo lớp", exact: true }).click();

  await page.getByText("Đã thêm 1 lớp học mới", { exact: true }).waitFor({ timeout: 3000 });
  assert(
    await page.getByText(`Lớp ${name}`, { exact: true }).count() === 1,
    `expected new class "${name}" to appear in the Khối ${grade} card`
  );

  const classes = await apiGet(`/api/classes?year=${encodeURIComponent(year.name)}`, cookie);
  const saved = classes.find((c) => c.name === name);
  assert(saved, `expected "${name}" to be persisted`);
  assert(saved.grade === grade, `expected grade ${grade}, got ${saved.grade}`);
  assert(saved.schoolYearId === year.id, `expected schoolYearId ${year.id}, got ${saved.schoolYearId}`);
});
