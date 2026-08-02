// UC09-08 — Không cho xoá giáo viên đã được xếp trong TKB [Abnormal]
// Steps: chọn xoá giáo viên đã có ít nhất một tiết -> Expect: hiện cảnh báo
// không thể xoá, không đưa ra lựa chọn xác nhận xoá và giữ nguyên dữ liệu.
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
  const { username, password } = await registerTestUser("uc09_08");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const subject = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0908 ${suffix}`,
      periodsGrade1: 2,
      periodsGrade2: 0,
      periodsGrade3: 0,
      periodsGrade4: 0,
      periodsGrade5: 0,
    },
    cookie
  );
  const teacherName = `Giáo viên đã xếp TKB UC0908 ${suffix}`;
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
  const timetables = await apiGet(`/api/timetables?schoolYearId=${schoolYear.id}`, cookie);
  const semesterOne = timetables.find((item) => item.semesterOrder === 1);
  assert(semesterOne, "expected semester 1 timetable fixture");
  const weeks = await apiGet(`/api/weeks?timetableId=${semesterOne.id}`, cookie);
  const weekOne = weeks.find((item) => item.weekNumber === 1);
  assert(weekOne, "expected week 1 fixture");
  const slot = await apiPost(
    "/api/slots",
    { weekId: weekOne.id, assignmentId: assignment.id, day: 2, session: 1, period: 1 },
    cookie
  );

  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr", { hasText: teacherName });
  await row.getByRole("button", { name: "Xóa", exact: true }).click();
  await page.waitForTimeout(500);

  const pageText = await page.locator("body").textContent();
  assert(
    /đã được xếp trong thời khoá biểu[\s\S]*không thể xoá/i.test(pageText),
    "expected a message explaining that a scheduled teacher cannot be deleted"
  );
  const destructiveConfirmation = page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xóa", exact: true });
  assert(
    await destructiveConfirmation.count() === 0,
    "must not offer destructive confirmation for a teacher already scheduled in the timetable"
  );

  const teachers = await apiGet("/api/teachers", cookie);
  assert(teachers.some((item) => item.id === teacher.id), "expected scheduled teacher to remain in API");
  const assignments = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  assert(assignments.some((item) => item.id === assignment.id), "expected scheduled assignment to remain");
  const slots = await apiGet(`/api/slots?weekId=${weekOne.id}`, cookie);
  assert(slots.some((item) => item.id === slot.id), "expected scheduled timetable slot to remain");
});
