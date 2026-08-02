// UC11-05 — Trùng tên lớp trong cùng năm học [Abnormal]
// Steps: chọn thêm hoặc sửa lớp -> nhập tên trùng với lớp khác trong cùng
// năm học -> xác nhận lưu -> Expect: hệ thống thông báo tên lớp bị trùng và
// không lưu.
//
// Covers both entry points named in the steps:
//  - Add: SchoolClassService.create() -> existsByNameAndSchoolYearId, 409
//    "Lớp 'X' đã tồn tại trong năm học này". ClassTable.handleSave shows this
//    via a generic "<n> lớp không thể tạo" toast (not the specific backend
//    message) and closes the dialog either way — weaker than the Subjects
//    page, which keeps its dialog open with an inline duplicate-name error,
//    but "không lưu" still holds.
//  - Edit: SchoolClassService.update() used to skip this check entirely
//    (rename-to-duplicate silently succeeded) — fixed to reuse the same
//    existsByNameAndSchoolYearIdAndIdNot guard as create(). The edit form's
//    catch block was also updated to surface the real backend message
//    instead of a generic one, so this path now shows the specific
//    "đã tồn tại" toast (still closes the dialog, same as Add).
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
  const { username, password } = await registerTestUser("uc11_05");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const grade = 2;
  const existing = await apiPost(
    "/api/classes",
    { name: `2E${suffix % 1000000}`, grade, schoolYearId: year.id },
    cookie
  );
  const other = await apiPost(
    "/api/classes",
    { name: `2F${suffix % 1000000}`, grade, schoolYearId: year.id },
    cookie
  );

  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });

  // --- Add: new class named after an existing one in the same year ---
  await page.getByRole("button", { name: `Thêm vào Khối ${grade}` }).click();
  const addDialog = page.getByRole("dialog");
  await addDialog.waitFor();
  await addDialog.locator("input").fill(existing.name);
  await addDialog.getByRole("button", { name: "Tạo lớp", exact: true }).click();

  await page.getByText("1 lớp không thể tạo", { exact: true }).waitFor({ timeout: 3000 });

  let classes = await apiGet(`/api/classes?year=${encodeURIComponent(year.name)}`, cookie);
  let matches = classes.filter((c) => c.name === existing.name);
  assert(matches.length === 1, `expected exactly one class named "${existing.name}" after add, found ${matches.length}`);

  // --- Edit: rename another existing class to collide with "existing" ---
  const row = page.locator("div.group", { hasText: `Lớp ${other.name}` });
  await row.locator("button").nth(0).click(); // pencil = edit
  const editDialog = page.getByRole("dialog");
  await editDialog.waitFor();
  await editDialog.locator("input").fill(existing.name);
  await editDialog.getByRole("button", { name: "Lưu", exact: true }).click();

  await page
    .getByText(`Lớp '${existing.name}' đã tồn tại trong năm học này`, { exact: true })
    .waitFor({ timeout: 3000 });

  classes = await apiGet(`/api/classes?year=${encodeURIComponent(year.name)}`, cookie);
  matches = classes.filter((c) => c.name === existing.name);
  assert(matches.length === 1, `expected exactly one class named "${existing.name}" after edit, found ${matches.length}`);
  const untouched = classes.find((c) => c.id === other.id);
  assert(untouched && untouched.name === other.name, `expected "${other.name}" to keep its name after a rejected rename`);
});
