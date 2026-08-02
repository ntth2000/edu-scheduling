// UC04-07 — Môn đã xếp đủ số tiết [Abnormal]
// Steps: xếp đủ số tiết mỗi tuần của một môn cho lớp -> mở danh sách môn
// tại ô trống khác -> thử chọn lại môn đã đủ tiết -> Expect: hệ thống hiển
// thị trạng thái đã đủ và không cho phép lựa chọn môn đó.
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

function cellLocator(overlay, day, period) {
  const dayIndex = [2, 3, 4, 5, 6].indexOf(day);
  const rows = overlay.locator('[style*="grid-template-columns"]');
  return rows.nth(period).locator("> div").nth(dayIndex + 1);
}

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc04_07");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const daoDuc = subjects.find((s) => s.name === "Đạo đức"); // periodsGrade1 = 1
  assert(daoDuc.periodsGrade1 === 1, "test invariant: Đạo đức must have exactly 1 period/week at grade 1");
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1H${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0407 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const assignment = await apiPost("/api/assignments", { classId: schoolClass.id, subjectId: daoDuc.id, teacherId: teacher.id }, cookie);

  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  // Fill the class's only Đạo đức period for the week — already "đủ tiết".
  await apiPost("/api/slots", { weekId: week1.id, assignmentId: assignment.id, day: 2, session: 1, period: 1 }, cookie);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();

  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  const otherCell = cellLocator(overlay, 3, 1); // a different empty cell: Thứ 3, Tiết 1
  await otherCell.click();

  const popover = page.locator('[data-slot="popover-content"]').last();
  await popover.waitFor();
  const option = popover.getByRole("button", { name: new RegExp(`^${daoDuc.name}`) });
  const optionText = await option.textContent();
  assert(optionText.includes("đủ rồi"), `expected the option to show "đủ rồi", got "${optionText}"`);
  assert(await option.isDisabled(), "expected the fully-scheduled subject's option to be disabled");
});
