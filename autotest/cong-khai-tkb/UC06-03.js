// UC06-03 — Tra cứu tuần đã công bố theo khối [Normal]
// Steps: mở URL công khai hợp lệ -> chọn một tuần đã công bố -> chọn chế độ
// xem theo khối -> chọn một khối -> Expect: hệ thống hiển thị đúng dữ liệu
// đã công bố của các lớp thuộc khối đã chọn.
//
// GradeView's <table> collapses the "Thứ"/"Buổi" leading columns via
// rowSpan, so most rows don't carry those cells — locating a class's column
// by header index is unreliable across rows. GradeView instead tags each
// occupied cell with `id="slot-{slotId}"`, so this locates the cell
// directly by the persisted slot's id instead of scanning rows/columns.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_03");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, teacher, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const slots = await scheduleWeekCompletely(weeks[0].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });

  // "Cả khối" (grade/GradeView) is the default class-view selection — no extra click needed.
  const table = page.locator("table");
  await table.waitFor();
  const headerTexts = (await table.locator("thead th").allTextContents()).map((t) => t.trim());
  assert(
    headerTexts.some((t) => t.includes(schoolClass.name)),
    `expected a column containing "${schoolClass.name}" in the grade table, got headers ${JSON.stringify(headerTexts)}`
  );

  const cellText = await page.locator(`#slot-${slots[0].id}`).textContent();
  assert(
    cellText.includes(subject.name) && cellText.includes(teacher.fullName),
    `expected the slot's cell (class "${schoolClass.name}") to show "${subject.name}" and "${teacher.fullName}", got "${cellText}"`
  );
});
