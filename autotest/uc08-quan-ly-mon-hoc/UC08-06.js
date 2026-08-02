// UC08-06 — Dữ liệu môn không hợp lệ [Abnormal]
// Steps: để trống tên hoặc nhập số tiết không hợp lệ -> Expect: hệ thống
// thông báo dữ liệu không hợp lệ và giữ nguyên danh sách.
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
  const { username, password } = await registerTestUser("uc08_06");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const subjectsBefore = await apiGet("/api/subjects", cookie);

  await page.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Thêm mới" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();

  // Case 1: blank subject name.
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await page.waitForTimeout(300);
  assert(await dialog.isVisible(), "expected form to remain open after blank subject name");
  const dialogTextAfterBlank = await dialog.textContent();
  assert(
    /không được để trống|vui lòng nhập/i.test(dialogTextAfterBlank),
    "expected a Vietnamese inline message for blank subject name"
  );

  // Case 2: invalid period value.
  await dialog.locator('input:not([type="number"])').fill(`Môn UC0806 ${Date.now()}`);
  const periodInputs = dialog.locator('input[type="number"]');
  await periodInputs.nth(0).fill("-5");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await page.waitForTimeout(300);
  assert(await dialog.isVisible(), "expected form to remain open after invalid period value");
  const dialogTextAfterInvalid = await dialog.textContent();
  assert(
    /không hợp lệ|phải\s*(>=|lớn hơn|từ)/i.test(dialogTextAfterInvalid),
    "expected a Vietnamese inline message for invalid period value"
  );

  const subjectsAfter = await apiGet("/api/subjects", cookie);
  assert(
    subjectsAfter.length === subjectsBefore.length,
    `expected no subject to be created, before=${subjectsBefore.length} after=${subjectsAfter.length}`
  );
});
