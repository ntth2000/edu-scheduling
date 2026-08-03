// UC06-02 — Tra cứu tuần đã công bố theo lớp [Normal]
// Steps: mở URL công khai hợp lệ -> chọn một tuần đã công bố -> chọn chế độ
// xem theo lớp -> chọn một lớp -> Expect: hệ thống hiển thị đúng dữ liệu đã
// công bố của lớp và tuần được chọn; mỗi ô có môn học và giáo viên phụ
// trách.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const {
  loginApiOnly,
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  cellLocator,
} = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_02");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, teacher, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const slots = await scheduleWeekCompletely(weeks[0].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });

  // Grade view (Cả khối) is the default — switch to the single-class view.
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  const cell = cellLocator(page, slots[0].day, slots[0].period);
  const cellText = await cell.textContent();
  assert(
    cellText.includes(subject.name) && cellText.includes(teacher.fullName),
    `expected the published slot's cell to show "${subject.name}" and "${teacher.fullName}", got "${cellText}"`
  );
});
