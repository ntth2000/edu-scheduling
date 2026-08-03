// UC06-05 — Chuyển giữa các tuần đã công bố [Normal]
// Steps: mở URL công khai hợp lệ -> chọn một tuần đã công bố và ghi nhận dữ
// liệu -> chọn một tuần đã công bố khác -> Expect: hệ thống tải đúng dữ
// liệu công khai của tuần mới; năm học, học kỳ và URL gắn với UID không
// thay đổi.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const {
  loginApiOnly,
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  cellLocator,
} = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_05");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const slots0 = await scheduleWeekCompletely(weeks[0].id, cookie);
  const slots2 = await scheduleWeekCompletely(weeks[2].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id, weeks[2].id], cookie);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });
  const urlBefore = page.url();

  let text = await cellLocator(page, slots0[0].day, slots0[0].period).textContent();
  assert(text.includes(subject.name), `expected week ${weeks[0].weekNumber}'s cell to show "${subject.name}", got "${text}"`);

  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[2].weekNumber}` });
  await page.waitForTimeout(300);

  text = await cellLocator(page, slots2[0].day, slots2[0].period).textContent();
  assert(text.includes(subject.name), `expected week ${weeks[2].weekNumber}'s cell to show "${subject.name}" after switching, got "${text}"`);

  assert(page.url() === urlBefore, `expected the URL to stay the same after switching weeks, was "${urlBefore}" now "${page.url()}"`);
});
