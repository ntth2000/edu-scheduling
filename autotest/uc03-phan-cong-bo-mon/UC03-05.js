// UC03-05 — Phân công vượt định mức [Abnormal]
// Steps: tiếp tục phân công cho một giáo viên cho tới khi tổng số tiết vượt
// định mức -> mở bảng Theo giáo viên -> Expect: hệ thống vẫn lưu phân công;
// tổng số tiết vượt định mức được hiển thị màu đỏ.
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
  const { username, password } = await registerTestUser("uc03_05");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán"); // periodsGrade1 = 3
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1E${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const maxPeriods = 2; // deliberately below Toán's 3 periods for grade 1
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0305 ${suffix}`, maxPeriodsPerWeek: maxPeriods, subjectIds: [] },
    cookie
  );

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: /^Theo lớp/ }).click();

  const classNameSpan = page.getByText(`Lớp ${schoolClass.name}`, { exact: true });
  const classCard = classNameSpan.locator("xpath=../..");
  const subjectRow = classCard.getByText(toan.name, { exact: true }).locator("xpath=..");
  await subjectRow.locator("select").selectOption({ label: teacher.fullName });
  await page.getByText("Đã lưu 1 phân công", { exact: true }).waitFor({ timeout: 3000 });

  await page.getByRole("button", { name: "Theo giáo viên" }).click();
  const periodsCell = page.locator("tbody tr", { hasText: teacher.fullName }).locator("td").nth(3);
  const text = (await periodsCell.textContent()).trim();
  assert(text.startsWith(String(toan.periodsGrade1)), `expected assigned periods ${toan.periodsGrade1}, got "${text}"`);
  assert(toan.periodsGrade1 > maxPeriods, "test setup invariant: assigned periods must exceed the quota");

  const assignedSpanClass = await periodsCell.locator("span").first().getAttribute("class");
  assert(assignedSpanClass.includes("text-red-500"), `expected the assigned-periods number to carry "text-red-500" when over quota, got class="${assignedSpanClass}"`);

  const assignments = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  const saved = assignments.find((a) => a.classId === schoolClass.id && a.subjectId === toan.id);
  assert(saved, "expected the over-quota assignment to still be persisted");
});
