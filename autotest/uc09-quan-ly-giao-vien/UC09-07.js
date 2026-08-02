// UC09-07 — Huỷ xoá giáo viên đã phân công nhưng chưa xếp TKB [Abnormal]
// Steps: mở cảnh báo xoá rồi chọn huỷ -> Expect: giáo viên và phân công vẫn
// còn nguyên.
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
  const { username, password } = await registerTestUser("uc09_07");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const subject = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0907 ${suffix}`,
      periodsGrade1: 2,
      periodsGrade2: 0,
      periodsGrade3: 0,
      periodsGrade4: 0,
      periodsGrade5: 0,
    },
    cookie
  );
  const teacherName = `Giáo viên huỷ xoá UC0907 ${suffix}`;
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
  await dialog.getByRole("button", { name: /Huỷ|Hủy/ }).click();
  await dialog.waitFor({ state: "hidden" });

  assert(
    await page.locator("table tbody tr", { hasText: teacherName }).count() === 1,
    `expected teacher "${teacherName}" to remain after cancelling deletion`
  );
  const teachers = await apiGet("/api/teachers", cookie);
  assert(teachers.some((item) => item.id === teacher.id), "expected teacher to remain in API");
  const assignments = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  assert(
    assignments.some((item) => item.id === assignment.id),
    "expected assignment to remain after cancelling teacher deletion"
  );
});
