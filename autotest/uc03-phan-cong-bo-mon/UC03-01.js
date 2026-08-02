// UC03-01 — Phân công theo lớp [Normal]
// Steps: mở Phân công giảng dạy -> chọn tab Phân công Chuyên môn -> chọn chế
// độ xem theo lớp -> chọn môn học của một lớp -> chọn giáo viên phụ trách
// và lưu -> Expect: phân công được lưu, giao diện cập nhật đúng giáo viên
// phụ trách môn của lớp.
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
  const { username, password } = await registerTestUser("uc03_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán"); // periodsGrade1 = 3
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1A${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0301 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: /^Theo lớp/ }).click();

  const classNameSpan = page.getByText(`Lớp ${schoolClass.name}`, { exact: true });
  const classCard = classNameSpan.locator("xpath=../.."); // span -> header row -> card
  const subjectRow = classCard.getByText(toan.name, { exact: true }).locator("xpath=..");
  await subjectRow.locator("select").selectOption({ label: teacher.fullName });

  await page.getByText("Đã lưu 1 phân công", { exact: true }).waitFor({ timeout: 3000 });
  const selectedLabel = await subjectRow.locator("select").evaluate((el) => el.selectedOptions[0].textContent);
  assert(selectedLabel.includes(teacher.fullName), `expected the select to show "${teacher.fullName}", got "${selectedLabel}"`);

  const assignments = await apiGet(`/api/assignments?classId=${schoolClass.id}`, cookie);
  const saved = assignments.find((a) => a.subjectId === toan.id);
  assert(saved, `expected an assignment for subject "${toan.name}" in class "${schoolClass.name}"`);
  assert(saved.teacherId === teacher.id, `expected teacherId ${teacher.id}, got ${saved.teacherId}`);
});
