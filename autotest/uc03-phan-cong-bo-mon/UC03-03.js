// UC03-03 — Cập nhật tổng số tiết [Normal]
// Steps: ghi nhận tổng số tiết hiện tại của giáo viên -> thêm một phân công
// mới -> quan sát tổng số tiết sau khi lưu -> Expect: tổng số tiết được cập
// nhật theo số tiết của môn và khối lớp vừa phân công, đồng thời được so
// sánh với định mức.
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
  const { username, password } = await registerTestUser("uc03_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán"); // periodsGrade1 = 3
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1C${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const maxPeriods = 20;
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0303 ${suffix}`, maxPeriodsPerWeek: maxPeriods, subjectIds: [] },
    cookie
  );

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: "Theo giáo viên" }).click();

  const periodsCell = () => page.locator("tbody tr", { hasText: teacher.fullName }).locator("td").nth(3);
  const before = (await periodsCell().textContent()).trim();
  assert(before.startsWith(`0`), `expected initial "Số tiết" to start at 0, got "${before}"`);
  assert(before.includes(String(maxPeriods)), `expected "Số tiết" to show the quota ${maxPeriods}, got "${before}"`);

  await page.getByRole("button", { name: /^Theo lớp/ }).click();
  const classNameSpan = page.getByText(`Lớp ${schoolClass.name}`, { exact: true });
  const classCard = classNameSpan.locator("xpath=../..");
  const subjectRow = classCard.getByText(toan.name, { exact: true }).locator("xpath=..");
  await subjectRow.locator("select").selectOption({ label: teacher.fullName });
  await page.getByText("Đã lưu 1 phân công", { exact: true }).waitFor({ timeout: 3000 });

  await page.getByRole("button", { name: "Theo giáo viên" }).click();
  const after = (await periodsCell().textContent()).trim();
  assert(
    after.startsWith(String(toan.periodsGrade1)),
    `expected "Số tiết" to update to ${toan.periodsGrade1} after assigning "${toan.name}", got "${after}"`
  );
  assert(after.includes(String(maxPeriods)), `expected the quota ${maxPeriods} to still be shown, got "${after}"`);

  const assignments = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  const totalPeriods = assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);
  assert(totalPeriods === toan.periodsGrade1, `expected total periods ${toan.periodsGrade1} via API, got ${totalPeriods}`);
});
