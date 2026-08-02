// UC11-08 — Huỷ xoá lớp có dữ liệu liên quan [Abnormal]
// Steps: chọn lớp đã có dữ liệu liên quan -> chọn xoá -> tại hộp thoại xác
// nhận, chọn huỷ -> Expect: lớp, phân công và tiết học liên quan được giữ
// nguyên.
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
  const { username, password } = await registerTestUser("uc11_08");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const subjects = await apiGet("/api/subjects", cookie);
  const subject = subjects[0];
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC1108 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [subject.id] },
    cookie
  );
  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1H${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
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
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Huỷ", exact: true }).click();
  await page.waitForTimeout(300);

  assert(
    await page.getByText(`Lớp ${schoolClass.name}`, { exact: true }).count() === 1,
    `expected class row "${schoolClass.name}" to remain after cancelling delete`
  );

  const classes = await apiGet(`/api/classes?year=${encodeURIComponent(year.name)}`, cookie);
  assert(classes.some((c) => c.id === schoolClass.id), "expected class to remain after cancelling delete");

  const assignments = await apiGet(`/api/assignments?classId=${schoolClass.id}`, cookie);
  assert(
    assignments.some((a) => a.id === assignment.id),
    "expected related assignment to remain after cancelling delete"
  );

  const slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(
    slots.some((s) => s.id === slot.id),
    "expected related slot to remain after cancelling delete"
  );
});
