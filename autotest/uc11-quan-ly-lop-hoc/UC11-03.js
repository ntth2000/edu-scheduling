// UC11-03 — Cập nhật lớp hợp lệ [Normal]
// Steps: chọn một lớp -> đổi tên lớp bằng dữ liệu hợp lệ -> lưu ->
// Expect: tên lớp được cập nhật và danh sách phản ánh dữ liệu mới.
// Popup sửa lớp chỉ cho đổi tên: ô Khối bị khoá (đổi khối làm lệch phân công và
// số tiết theo khối) và không còn ô chọn GVCN, GVCN hiện tại phải được giữ nguyên.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
  API_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc11_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const grade = 1;
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1U${suffix % 1000000}`, grade, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GVCN UC1103 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  await fetch(`${API_URL}/api/classes/${schoolClass.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: schoolClass.name, grade, homeroomTeacherId: teacher.id }),
  });

  const newName = `1V${suffix % 1000000}`;

  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const row = page.locator("div.group", { hasText: `Lớp ${schoolClass.name}` });
  await row.locator("button").nth(0).click(); // pencil = edit

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();

  const gradeSelect = dialog.getByRole("combobox").first();
  assert(await gradeSelect.isDisabled(), "expected the Khối select to be disabled in edit mode");
  const dialogText = await dialog.innerText();
  assert(!dialogText.includes("Giáo viên chủ nhiệm"), "expected no homeroom-teacher field in edit mode");

  await dialog.locator("input").fill(newName);
  await dialog.getByRole("button", { name: "Lưu", exact: true }).click();

  await page.getByText("Đã cập nhật thông tin lớp học", { exact: true }).waitFor({ timeout: 3000 });
  assert(
    await page.getByText(`Lớp ${schoolClass.name}`, { exact: true }).count() === 0,
    `expected old name "${schoolClass.name}" to be gone from the list`
  );
  assert(
    await page.getByText(`Lớp ${newName}`, { exact: true }).count() === 1,
    `expected updated name "${newName}" to appear in the Khối ${grade} card`
  );

  const updated = await apiGet(`/api/classes/${schoolClass.id}`, cookie);
  assert(updated.name === newName, `expected persisted name "${newName}", got "${updated.name}"`);
  assert(updated.grade === grade, `expected grade to stay ${grade}, got ${updated.grade}`);
  assert(
    updated.homeroomTeacherId === teacher.id,
    `expected homeroom teacher ${teacher.id} to be kept, got ${updated.homeroomTeacherId}`
  );
});
