// UC08-08 — Huỷ xoá môn có dữ liệu liên quan [Abnormal]
// Steps: thực hiện UC08-07, tại hộp thoại xác nhận chọn huỷ -> Expect: môn
// học và toàn bộ dữ liệu liên quan được giữ nguyên.
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
  const { username, password } = await registerTestUser("uc08_08");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const subject = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0808 ${suffix}`,
      periodsGrade1: 2,
      periodsGrade2: 0,
      periodsGrade3: 0,
      periodsGrade4: 0,
      periodsGrade5: 0,
    },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0808 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [subject.id] },
    cookie
  );
  const schoolYear = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 101) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1A${suffix % 1000000}`, grade: 1, schoolYearId: schoolYear.id },
    cookie
  );
  const assignment = await apiPost(
    "/api/assignments",
    { classId: schoolClass.id, subjectId: subject.id, teacherId: teacher.id },
    cookie
  );

  await page.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr", { hasText: subject.name });
  await row.locator("button").nth(1).click(); // trash = delete

  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Huỷ", exact: true }).click();
  await page.waitForTimeout(300);

  assert(
    await page.locator("table tbody tr", { hasText: subject.name }).count() === 1,
    `expected subject row "${subject.name}" to remain after cancelling delete`
  );

  const subjects = await apiGet("/api/subjects", cookie);
  assert(subjects.some((s) => s.id === subject.id), "expected subject to remain after cancelling delete");
  const assignments = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  assert(
    assignments.some((a) => a.id === assignment.id),
    "expected related assignment to remain after cancelling delete"
  );
});
