// UC08-07 — Xoá môn có dữ liệu liên quan [Abnormal]
// Steps: chọn môn đã có phân công hoặc tiết học liên quan, chọn xoá -> Expect:
// hệ thống hiển thị yêu cầu xác nhận trước khi thực hiện thao tác ảnh hưởng
// dữ liệu liên quan.
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
  const { username, password } = await registerTestUser("uc08_07");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const subject = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0807 ${suffix}`,
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
    { fullName: `GV UC0807 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [subject.id] },
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
  await dialog.waitFor({ timeout: 3000 });
  assert(await dialog.isVisible(), "expected a confirmation dialog before deleting a subject with related data");

  // The destructive call must not have happened yet — related data still intact while dialog is open.
  const subjectsWhileOpen = await apiGet("/api/subjects", cookie);
  assert(
    subjectsWhileOpen.some((s) => s.id === subject.id),
    "expected subject to still exist while confirmation dialog is open"
  );
  const assignmentsWhileOpen = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  assert(
    assignmentsWhileOpen.some((a) => a.id === assignment.id),
    "expected related assignment to still exist while confirmation dialog is open"
  );
});
