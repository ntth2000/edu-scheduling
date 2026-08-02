// UC08-05 — Tên môn bị trùng [Abnormal]
// Steps: thêm hoặc sửa môn với tên trùng môn hiện có -> Expect: hệ thống
// thông báo tên môn bị trùng và không lưu thay đổi.
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
  const { username, password } = await registerTestUser("uc08_05");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();
  const existing = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0805 ${suffix}`,
      periodsGrade1: 1,
      periodsGrade2: 1,
      periodsGrade3: 1,
      periodsGrade4: 1,
      periodsGrade5: 1,
    },
    cookie
  );

  await page.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Thêm mới" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator('input:not([type="number"])').fill(existing.name);
  const periodInputs = dialog.locator('input[type="number"]');
  for (let i = 0; i < 5; i++) await periodInputs.nth(i).fill("2");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();
  await page.waitForTimeout(500);

  const bodyText = await page.locator("body").textContent();
  assert(/trùng|đã tồn tại/i.test(bodyText), "expected a duplicate-name error message");
  assert(await dialog.count() === 1, "expected the form dialog to remain open after a failed save");

  const subjects = await apiGet("/api/subjects", cookie);
  const matches = subjects.filter((s) => s.name === existing.name);
  assert(matches.length === 1, `expected exactly one subject named "${existing.name}", found ${matches.length}`);
});
