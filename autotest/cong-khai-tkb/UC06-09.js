// UC06-09 — Công bố thêm tuần trên cùng URL [Normal]
// Steps: mở URL học kỳ và xác nhận tuần N đang để trống do chưa công bố ->
// đăng nhập trang quản lý và công bố tuần N -> mở lại đúng URL cũ -> chọn
// tuần N -> Expect: URL và UID của học kỳ không đổi; tuần N bắt đầu hiển
// thị đúng dữ liệu vừa được công bố.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const {
  loginApiOnly,
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  cellLocator,
} = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_09");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  const firstPublish = await publishWeeks(semester1.id, [weeks[0].id], cookie);
  const token = firstPublish.publicToken;

  const slotsN = await scheduleWeekCompletely(weeks[1].id, cookie); // week N, scheduled but not published yet

  await page.goto(`${BASE_URL}/public/timetable/${token}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });
  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[1].weekNumber}` });
  await page.waitForTimeout(300);
  let cellText = await cellLocator(page, slotsN[0].day, slotsN[0].period).textContent();
  assert(!cellText.includes(subject.name), `expected week ${weeks[1].weekNumber} to still be empty before publishing, got "${cellText}"`);

  const secondPublish = await publishWeeks(semester1.id, [weeks[0].id, weeks[1].id], cookie);
  assert(secondPublish.publicToken === token, `expected the same publicToken after publishing an extra week, got "${secondPublish.publicToken}" vs original "${token}"`);

  await page.goto(`${BASE_URL}/public/timetable/${token}`, { waitUntil: "networkidle" });
  assert(page.url().includes(`/public/timetable/${token}`), "expected to reload the exact same URL successfully");
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });
  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[1].weekNumber}` });
  await page.waitForTimeout(300);
  cellText = await cellLocator(page, slotsN[0].day, slotsN[0].period).textContent();
  assert(cellText.includes(subject.name), `expected week ${weeks[1].weekNumber} to show "${subject.name}" after being published, got "${cellText}"`);
});
