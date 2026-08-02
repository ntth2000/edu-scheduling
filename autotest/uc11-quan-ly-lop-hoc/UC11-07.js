// UC11-07 — Xoá lớp có dữ liệu liên quan và xác nhận [Abnormal]
// Steps: chọn lớp đã có phân công hoặc tiết học -> chọn xoá -> xác nhận xoá
// dữ liệu liên quan -> Expect: hệ thống yêu cầu xác nhận trước; sau khi xác
// nhận, lớp cùng phân công và tiết học liên quan được xoá, danh sách được
// cập nhật.
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
  const { username, password } = await registerTestUser("uc11_07");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const subjects = await apiGet("/api/subjects", cookie);
  const subject = subjects[0];
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC1107 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [subject.id] },
    cookie
  );
  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1G${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const assignment = await apiPost(
    "/api/assignments",
    { classId: schoolClass.id, subjectId: subject.id, teacherId: teacher.id },
    cookie
  );
  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  const slot = await apiPost(
    "/api/slots",
    { weekId: week1.id, classId: schoolClass.id, subjectId: subject.id, day: 2, session: 1, period: 1 },
    cookie
  );

  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const row = page.locator("div.group", { hasText: `Lớp ${schoolClass.name}` });
  await row.locator("button").nth(1).click(); // trash = delete

  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor({ timeout: 3000 });
  assert(await dialog.isVisible(), "expected a confirmation dialog before deleting a class with related data");

  // The destructive call must not have happened yet — related data still intact while dialog is open.
  const assignmentsWhileOpen = await apiGet(`/api/assignments?classId=${schoolClass.id}`, cookie);
  assert(
    assignmentsWhileOpen.some((a) => a.id === assignment.id),
    "expected related assignment to still exist while confirmation dialog is open"
  );
  const slotsWhileOpen = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(
    slotsWhileOpen.some((s) => s.id === slot.id),
    "expected related slot to still exist while confirmation dialog is open"
  );

  await dialog.getByRole("button", { name: "Xóa", exact: true }).click();

  await page.getByText(`Đã xóa Lớp ${schoolClass.name}`, { exact: true }).waitFor({ timeout: 3000 });
  assert(
    await page.getByText(`Lớp ${schoolClass.name}`, { exact: true }).count() === 0,
    `expected class row "${schoolClass.name}" to be removed from the page`
  );

  const classes = await apiGet(`/api/classes?year=${encodeURIComponent(year.name)}`, cookie);
  assert(!classes.some((c) => c.id === schoolClass.id), "expected class to be deleted from the API");

  const assignmentsAfter = await apiGet(`/api/assignments?classId=${schoolClass.id}`, cookie);
  assert(assignmentsAfter.length === 0, "expected related assignment to be deleted too");

  const slotsAfter = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(!slotsAfter.some((s) => s.id === slot.id), "expected related slot to be deleted too");
});
