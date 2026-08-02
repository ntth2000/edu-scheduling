// UC02-04 — Xoá GVCN và xác nhận [Abnormal]
// Steps: chọn lớp đã có GVCN -> chọn giá trị trống để xoá GVCN -> tại hộp
// thoại xác nhận, chọn đồng ý -> Expect: hệ thống xoá GVCN khỏi lớp, lưu
// thay đổi và cập nhật giao diện.
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
  const { username, password } = await registerTestUser("uc02_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0204 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `3A${suffix % 1000000}`, grade: 3, schoolYearId: year.id },
    cookie
  );
  await apiPost("/api/assignments/homeroom", { classId: schoolClass.id, teacherId: teacher.id }, cookie);

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chủ nhiệm" }).click();

  const row = page.getByText(schoolClass.name, { exact: true }).locator("xpath=..");
  await row.getByRole("combobox").click();
  await page.getByRole("option", { name: "Chưa phân công", exact: true }).click();

  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  assert(
    await dialog.getByText(`Xóa giáo viên chủ nhiệm lớp ${schoolClass.name}?`).count() === 1,
    "expected a confirmation dialog before removing the GVCN"
  );
  await dialog.getByRole("button", { name: "Xóa GVCN", exact: true }).click();

  await page.getByText(`Đã xóa GVCN lớp ${schoolClass.name}`, { exact: true }).waitFor({ timeout: 3000 });
  const displayed = await row.getByRole("combobox").textContent();
  assert(displayed.includes("Chưa phân công"), `expected select to show "Chưa phân công", got "${displayed}"`);

  const updated = await apiGet(`/api/classes/${schoolClass.id}`, cookie);
  assert(updated.homeroomTeacherId === null, `expected homeroomTeacherId null, got ${updated.homeroomTeacherId}`);
});
