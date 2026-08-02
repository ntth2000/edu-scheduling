// UC02-07 — Cùng giáo viên làm GVCN ở hai năm học khác nhau [Normal]
// Steps: tạo Năm học 1 và một lớp thuộc năm học này -> phân công một giáo
// viên làm GVCN cho lớp của Năm học 1 -> tạo Năm học 2 và một lớp mới thuộc
// Năm học 2 -> mở chức năng phân công GVCN cho lớp mới -> chọn lại giáo
// viên đang làm GVCN ở Năm học 1 và lưu -> Expect: giáo viên vẫn xuất hiện
// trong danh sách có thể chọn của Năm học 2; hệ thống lưu phân công thành
// công cho lớp mới. Phân công GVCN ở Năm học 1 được giữ nguyên và giáo viên
// trở thành GVCN của một lớp trong mỗi năm học.
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
  const { username, password } = await registerTestUser("uc02_07");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year1 = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 45) }, cookie);
  const year2 = await apiPost("/api/school-years", { startYear: 2046 + (suffix % 45) }, cookie);
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0207 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const classYear1 = await apiPost(
    "/api/classes",
    { name: `5A${suffix % 1000000}`, grade: 5, schoolYearId: year1.id },
    cookie
  );
  const classYear2 = await apiPost(
    "/api/classes",
    { name: `5A${suffix % 1000000}`, grade: 5, schoolYearId: year2.id },
    cookie
  );
  await apiPost("/api/assignments/homeroom", { classId: classYear1.id, teacherId: teacher.id }, cookie);

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year2.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chủ nhiệm" }).click();

  const row = page.getByText(classYear2.name, { exact: true }).locator("xpath=..");
  await row.getByRole("combobox").click();
  const optionTexts = (await page.getByRole("option").allTextContents()).map((t) => t.trim());
  assert(
    optionTexts.includes(teacher.fullName),
    `expected "${teacher.fullName}" (GVCN in a different school year) to still be selectable in ${year2.name}, got ${JSON.stringify(optionTexts)}`
  );

  await page.getByRole("option", { name: teacher.fullName, exact: true }).click();
  await page.getByText(`Đã cập nhật GVCN lớp ${classYear2.name}`, { exact: true }).waitFor({ timeout: 3000 });

  const class2After = await apiGet(`/api/classes/${classYear2.id}`, cookie);
  assert(class2After.homeroomTeacherId === teacher.id, `expected class in ${year2.name} to have homeroomTeacherId ${teacher.id}, got ${class2After.homeroomTeacherId}`);

  const class1After = await apiGet(`/api/classes/${classYear1.id}`, cookie);
  assert(class1After.homeroomTeacherId === teacher.id, `expected class in ${year1.name} to keep homeroomTeacherId ${teacher.id}, got ${class1After.homeroomTeacherId}`);
});
