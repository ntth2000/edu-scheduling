// UC02-05 — Huỷ xoá GVCN [Abnormal]
// Steps: chọn lớp đã có GVCN -> chọn giá trị trống -> tại hộp thoại xác
// nhận, chọn huỷ -> Expect: hệ thống không thay đổi phân công; GVCN hiện
// tại vẫn được giữ nguyên.
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
  const { username, password } = await registerTestUser("uc02_05");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0205 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `3B${suffix % 1000000}`, grade: 3, schoolYearId: year.id },
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
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.waitForTimeout(300);

  const displayed = await row.getByRole("combobox").textContent();
  assert(displayed.includes(teacher.fullName), `expected select to still show "${teacher.fullName}", got "${displayed}"`);

  const updated = await apiGet(`/api/classes/${schoolClass.id}`, cookie);
  assert(updated.homeroomTeacherId === teacher.id, `expected homeroomTeacherId to remain ${teacher.id}, got ${updated.homeroomTeacherId}`);
});
