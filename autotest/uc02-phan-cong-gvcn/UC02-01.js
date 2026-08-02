// UC02-01 — Gán giáo viên chủ nhiệm cho lớp [Normal]
// Steps: mở Phân công giảng dạy -> chọn tab Phân công Chủ nhiệm -> chọn một
// lớp chưa có GVCN -> chọn một giáo viên chưa chủ nhiệm lớp khác trong năm
// học -> Expect: phân công được lưu; giao diện hiển thị giáo viên vừa chọn
// tại lớp tương ứng.
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
  const { username, password } = await registerTestUser("uc02_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1A${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0201 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chủ nhiệm" }).click();

  const row = page.getByText(schoolClass.name, { exact: true }).locator("xpath=..");
  await row.getByRole("combobox").click();
  await page.getByRole("option", { name: teacher.fullName, exact: true }).click();

  await page.getByText(`Đã cập nhật GVCN lớp ${schoolClass.name}`, { exact: true }).waitFor({ timeout: 3000 });
  assert(
    (await row.getByRole("combobox").textContent()).includes(teacher.fullName),
    `expected the select for "${schoolClass.name}" to display "${teacher.fullName}"`
  );

  const updated = await apiGet(`/api/classes/${schoolClass.id}`, cookie);
  assert(updated.homeroomTeacherId === teacher.id, `expected homeroomTeacherId ${teacher.id}, got ${updated.homeroomTeacherId}`);
});
