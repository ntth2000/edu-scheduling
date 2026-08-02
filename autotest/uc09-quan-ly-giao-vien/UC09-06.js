// UC09-06 — Xoá giáo viên đã phân công nhưng chưa xếp TKB và đồng ý [Normal]
// Steps: xoá giáo viên có phân công chưa xếp, đọc cảnh báo rồi đồng ý ->
// Expect: giáo viên và phân công liên quan đều bị xoá.
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
  const { username, password } = await registerTestUser("uc09_06");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const subject = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0906 ${suffix}`,
      periodsGrade1: 2,
      periodsGrade2: 0,
      periodsGrade3: 0,
      periodsGrade4: 0,
      periodsGrade5: 0,
    },
    cookie
  );
  const teacherName = `Giáo viên có phân công UC0906 ${suffix}`;
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: teacherName, type: "BO_MON", maxPeriodsPerWeek: 20, subjectIds: [subject.id] },
    cookie
  );
  const schoolYear = await apiPost(
    "/api/school-years",
    { startYear: 2000 + (suffix % 101) },
    cookie
  );
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

  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr", { hasText: teacherName });
  await row.getByRole("button", { name: "Xóa", exact: true }).click();

  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  const warning = await dialog.textContent();
  assert(
    /phân công[\s\S]*chưa xếp[\s\S]*sẽ bị xoá/i.test(warning),
    `expected assignment deletion warning, got "${warning}"`
  );
  await dialog.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.getByText(/Đã xóa 1 giáo viên.*1 phân công môn học/).waitFor({ timeout: 3000 });

  assert(
    await page.locator("table tbody tr", { hasText: teacherName }).count() === 0,
    `expected deleted teacher "${teacherName}" to disappear`
  );
  const teachers = await apiGet("/api/teachers", cookie);
  assert(!teachers.some((item) => item.id === teacher.id), "expected teacher to be deleted from API");
  const assignments = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  assert(
    !assignments.some((item) => item.id === assignment.id),
    "expected the unscheduled assignment to be deleted with its teacher"
  );
});
