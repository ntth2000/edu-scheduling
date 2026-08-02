// UC08-03 — Cập nhật môn học hợp lệ [Normal]
// Steps: chọn môn hiện có, sửa tên/số tiết hợp lệ, lưu -> Expect: thông tin
// được cập nhật và danh sách hiển thị dữ liệu mới.
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
  const { username, password } = await registerTestUser("uc08_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();
  const original = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0803 ${suffix}`,
      periodsGrade1: 1,
      periodsGrade2: 1,
      periodsGrade3: 1,
      periodsGrade4: 1,
      periodsGrade5: 1,
    },
    cookie
  );

  await page.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr", { hasText: original.name });
  await row.locator("button").nth(0).click(); // pencil = edit

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const newName = `${original.name} (sửa)`;
  await dialog.locator('input:not([type="number"])').fill(newName);
  const periodInputs = dialog.locator('input[type="number"]');
  await periodInputs.nth(0).fill("7");
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();

  await page.getByText("Đã cập nhật môn học", { exact: true }).waitFor({ timeout: 3000 });
  const updatedRow = page.locator("table tbody tr", { hasText: newName });
  assert(await updatedRow.count() === 1, `expected updated row "${newName}"`);
  const cellText = (await updatedRow.locator("td").nth(2).textContent()).trim();
  assert(cellText === "7", `expected grade 1 period 7, got "${cellText}"`);

  const subjects = await apiGet("/api/subjects", cookie);
  const saved = subjects.find((s) => s.id === original.id);
  assert(saved, "expected the subject to still exist after update");
  assert(saved.name === newName, `expected persisted name "${newName}", got "${saved.name}"`);
  assert(saved.periodsGrade1 === 7, `expected persisted grade-1 period 7, got ${saved.periodsGrade1}`);
});
