// UC02-02 — Danh sách giáo viên đủ điều kiện [Normal]
// Steps: mở danh sách chọn GVCN của một lớp -> kiểm tra các giáo viên được
// hiển thị -> Expect: danh sách không phân loại giáo viên và chỉ cho phép
// chọn giáo viên hiện chưa là GVCN của lớp khác trong cùng năm học.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc02_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const assignedTeacher = await apiPost(
    "/api/teachers",
    { fullName: `GV Da Chu Nhiem ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const eligibleTeacher = await apiPost(
    "/api/teachers",
    { fullName: `GV Con Trong ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const classWithGvcn = await apiPost(
    "/api/classes",
    { name: `1C${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const classWithoutGvcn = await apiPost(
    "/api/classes",
    { name: `1D${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  await apiPost("/api/assignments/homeroom", { classId: classWithGvcn.id, teacherId: assignedTeacher.id }, cookie);

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chủ nhiệm" }).click();

  const row = page.getByText(classWithoutGvcn.name, { exact: true }).locator("xpath=..");
  await row.getByRole("combobox").click();

  const optionTexts = (await page.getByRole("option").allTextContents()).map((t) => t.trim());
  assert(
    optionTexts.includes(eligibleTeacher.fullName),
    `expected "${eligibleTeacher.fullName}" (no other homeroom) to be selectable, got ${JSON.stringify(optionTexts)}`
  );
  assert(
    !optionTexts.includes(assignedTeacher.fullName),
    `expected "${assignedTeacher.fullName}" (already GVCN of "${classWithGvcn.name}") to NOT be selectable, got ${JSON.stringify(optionTexts)}`
  );
  // "Không phân loại giáo viên": no section/group headers, just the placeholder + eligible teachers.
  assert(
    optionTexts.length === 2 && optionTexts.includes("Chưa phân công"),
    `expected exactly ["Chưa phân công", "${eligibleTeacher.fullName}"], got ${JSON.stringify(optionTexts)}`
  );
});
