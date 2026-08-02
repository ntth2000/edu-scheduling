// UC09-04 — Dữ liệu giáo viên không hợp lệ [Abnormal]
// Steps: để trống họ tên hoặc nhập định mức không hợp lệ -> Expect: hiện lỗi,
// giữ form để sửa và không tạo giáo viên.
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
  const { username, password } = await registerTestUser("uc09_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);

  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Thêm giáo viên|Thêm mới/i }).first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const inputs = dialog.locator("input");

  // Case 1: empty full name.
  await inputs.nth(0).fill("");
  await inputs.nth(1).fill("20");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  assert(
    await dialog.getByText("Vui lòng nhập họ và tên", { exact: true }).count() > 0,
    "expected validation message for empty teacher name"
  );
  assert(await dialog.isVisible(), "expected form to remain open after empty name");

  // Case 2: non-positive weekly period limit.
  await inputs.nth(0).fill(`Giáo viên không hợp lệ ${Date.now()}`);
  await inputs.nth(1).fill("0");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  assert(
    await dialog.getByText("Số tiết phải lớn hơn 0", { exact: true }).count() > 0,
    "expected validation message for invalid weekly period limit"
  );
  assert(await dialog.isVisible(), "expected form to remain open after invalid weekly limit");

  const teachers = await apiGet("/api/teachers", cookie);
  assert(teachers.length === 0, `expected no teacher to be saved, found ${teachers.length}`);
});
