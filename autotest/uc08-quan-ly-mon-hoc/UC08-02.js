// UC08-02 — Thêm môn học hợp lệ [Normal]
// Steps: nhập tên môn chưa tồn tại + số tiết hợp lệ cho các khối -> Expect:
// môn học được lưu, xuất hiện trong danh sách với đúng số tiết theo khối.
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
  const { username, password } = await registerTestUser("uc08_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const name = `Môn UC0802 ${Date.now()}`;
  const periods = [3, 2, 1, 4, 5];

  await page.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Thêm mới" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.locator('input:not([type="number"])').fill(name);
  const periodInputs = dialog.locator('input[type="number"]');
  for (let i = 0; i < periods.length; i++) {
    await periodInputs.nth(i).fill(String(periods[i]));
  }
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();

  await page.getByText("Đã thêm môn học mới", { exact: true }).waitFor({ timeout: 3000 });
  const row = page.locator("table tbody tr", { hasText: name });
  assert(await row.count() === 1, `expected a row for new subject "${name}"`);
  const cells = row.locator("td");
  for (let i = 0; i < periods.length; i++) {
    const text = (await cells.nth(2 + i).textContent()).trim();
    assert(text === String(periods[i]), `expected grade ${i + 1} period ${periods[i]}, got "${text}"`);
  }

  const subjects = await apiGet("/api/subjects", cookie);
  const saved = subjects.find((s) => s.name === name);
  assert(saved, `expected "${name}" to be persisted`);
  assert(
    saved.periodsGrade1 === periods[0] &&
      saved.periodsGrade2 === periods[1] &&
      saved.periodsGrade3 === periods[2] &&
      saved.periodsGrade4 === periods[3] &&
      saved.periodsGrade5 === periods[4],
    `expected persisted periods to match, got ${JSON.stringify(saved)}`
  );
});
