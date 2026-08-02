// UC03-04 — Thay thế giáo viên đã phân công [Abnormal]
// Steps: chọn môn học của lớp đã có giáo viên phụ trách -> ghi nhận giáo
// viên đang được phân công -> chọn một giáo viên khác -> lưu thay đổi ->
// kiểm tra phân công của cả giáo viên mới và giáo viên cũ -> Expect: hệ
// thống tự động thay thế giáo viên cũ bằng giáo viên mới, không hiển thị
// xác nhận trước khi ghi đè. Lớp/môn xuất hiện trong phân công và cột "Môn
// dạy" của giáo viên mới; phân công tương ứng được gỡ khỏi giáo viên cũ và
// không còn xuất hiện trong cột "Môn dạy" của giáo viên cũ.
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
  const { username, password } = await registerTestUser("uc03_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán");
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1D${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const oldTeacher = await apiPost(
    "/api/teachers",
    { fullName: `GV Cu UC0304 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const newTeacher = await apiPost(
    "/api/teachers",
    { fullName: `GV Moi UC0304 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  await apiPost("/api/assignments", { classId: schoolClass.id, subjectId: toan.id, teacherId: oldTeacher.id }, cookie);

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: /^Theo lớp/ }).click();

  const classNameSpan = page.getByText(`Lớp ${schoolClass.name}`, { exact: true });
  const classCard = classNameSpan.locator("xpath=../..");
  const subjectRow = classCard.getByText(toan.name, { exact: true }).locator("xpath=..");
  const select = subjectRow.locator("select");

  const beforeLabel = await select.evaluate((el) => el.selectedOptions[0].textContent);
  assert(beforeLabel.includes(oldTeacher.fullName), `expected the select to initially show "${oldTeacher.fullName}", got "${beforeLabel}"`);

  await select.selectOption({ label: newTeacher.fullName });

  // No confirmation dialog should appear before overwriting.
  assert(await page.getByRole("alertdialog").count() === 0, "expected no confirmation dialog when replacing an already-assigned teacher");

  await page.getByText("Đã lưu 1 phân công", { exact: true }).waitFor({ timeout: 3000 });
  const afterLabel = await select.evaluate((el) => el.selectedOptions[0].textContent);
  assert(afterLabel.includes(newTeacher.fullName), `expected the select to show "${newTeacher.fullName}", got "${afterLabel}"`);

  await page.getByRole("button", { name: "Theo giáo viên" }).click();
  const newSummary = await page.locator("tbody tr", { hasText: newTeacher.fullName }).locator("td").last().textContent();
  assert(
    newSummary.includes(schoolClass.name) && newSummary.includes(toan.name),
    `expected new teacher's "Môn dạy" to include "${schoolClass.name}" / "${toan.name}", got "${newSummary}"`
  );
  const oldSummary = await page.locator("tbody tr", { hasText: oldTeacher.fullName }).locator("td").last().textContent();
  assert(
    !oldSummary.includes(schoolClass.name),
    `expected old teacher's "Môn dạy" to no longer include "${schoolClass.name}", got "${oldSummary}"`
  );

  const assignments = await apiGet(`/api/assignments?classId=${schoolClass.id}`, cookie);
  const saved = assignments.find((a) => a.subjectId === toan.id);
  assert(saved.teacherId === newTeacher.id, `expected teacherId ${newTeacher.id}, got ${saved.teacherId}`);

  const oldTeacherAssignments = await apiGet(`/api/assignments?teacherId=${oldTeacher.id}`, cookie);
  assert(oldTeacherAssignments.length === 0, `expected old teacher to have no remaining assignments, got ${oldTeacherAssignments.length}`);
});
