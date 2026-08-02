// UC02-03 — Thay đổi GVCN của lớp [Normal]
// Steps: chọn lớp đã có GVCN -> chọn một giáo viên chủ nhiệm hợp lệ khác ->
// xác nhận lựa chọn -> Expect: GVCN mới được lưu và giao diện được cập nhật;
// lớp chỉ có một GVCN.
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
  const { username, password } = await registerTestUser("uc02_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const oldTeacher = await apiPost(
    "/api/teachers",
    { fullName: `GV Cu ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const newTeacher = await apiPost(
    "/api/teachers",
    { fullName: `GV Moi ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `2A${suffix % 1000000}`, grade: 2, schoolYearId: year.id },
    cookie
  );
  await apiPost("/api/assignments/homeroom", { classId: schoolClass.id, teacherId: oldTeacher.id }, cookie);

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chủ nhiệm" }).click();

  const row = page.getByText(schoolClass.name, { exact: true }).locator("xpath=..");
  const combobox = row.getByRole("combobox");
  assert(
    (await combobox.textContent()).includes(oldTeacher.fullName),
    `expected the select to initially show "${oldTeacher.fullName}"`
  );

  await combobox.click();
  await page.getByRole("option", { name: newTeacher.fullName, exact: true }).click();

  await page.getByText(`Đã cập nhật GVCN lớp ${schoolClass.name}`, { exact: true }).waitFor({ timeout: 3000 });
  const displayed = await combobox.textContent();
  assert(displayed.includes(newTeacher.fullName), `expected select to show "${newTeacher.fullName}", got "${displayed}"`);
  assert(!displayed.includes(oldTeacher.fullName), `expected select to no longer show "${oldTeacher.fullName}", got "${displayed}"`);

  const updated = await apiGet(`/api/classes/${schoolClass.id}`, cookie);
  assert(updated.homeroomTeacherId === newTeacher.id, `expected homeroomTeacherId ${newTeacher.id}, got ${updated.homeroomTeacherId}`);
});
