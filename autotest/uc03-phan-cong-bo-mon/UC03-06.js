// UC03-06 — Xoá phân công bộ môn [Normal]
// Steps: chọn một phân công hiện có -> loại bỏ giáo viên phụ trách hoặc
// thực hiện thao tác xoá phân công -> xác nhận nếu được yêu cầu -> Expect:
// phân công được xoá và tổng số tiết của giáo viên được cập nhật giảm
// tương ứng.
//
// Note: this flow (theo-lớp select reset to "— Chưa phân công —") never
// asks for confirmation — SubjectAssignment.handleSubjectBatchSave deletes
// immediately, so "xác nhận nếu được yêu cầu" doesn't apply here.
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
  const { username, password } = await registerTestUser("uc03_06");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán"); // periodsGrade1 = 3
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1F${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0306 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const assignment = await apiPost(
    "/api/assignments",
    { classId: schoolClass.id, subjectId: toan.id, teacherId: teacher.id },
    cookie
  );

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: /^Theo lớp/ }).click();

  const classNameSpan = page.getByText(`Lớp ${schoolClass.name}`, { exact: true });
  const classCard = classNameSpan.locator("xpath=../..");
  const subjectRow = classCard.getByText(toan.name, { exact: true }).locator("xpath=..");
  const select = subjectRow.locator("select");
  await select.selectOption({ label: "— Chưa phân công —" });

  await page.getByText("Đã lưu 1 phân công", { exact: true }).waitFor({ timeout: 3000 });
  const afterLabel = await select.evaluate((el) => el.selectedOptions[0].textContent);
  assert(afterLabel.includes("Chưa phân công"), `expected the select to reset to "Chưa phân công", got "${afterLabel}"`);

  await page.getByRole("button", { name: "Theo giáo viên" }).click();
  const periodsCell = page.locator("tbody tr", { hasText: teacher.fullName }).locator("td").nth(3);
  const periodsText = (await periodsCell.textContent()).trim();
  assert(periodsText.startsWith("0"), `expected "Số tiết" to drop back to 0, got "${periodsText}"`);

  const assignmentsAfter = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  assert(
    !assignmentsAfter.some((a) => a.id === assignment.id),
    "expected the assignment to be deleted"
  );
});
