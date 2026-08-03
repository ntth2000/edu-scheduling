// UC06-01 — Mở URL công khai của học kỳ không cần đăng nhập [Normal]
// Steps: công bố ít nhất một tuần của học kỳ -> đăng xuất hoặc mở trình
// duyệt ẩn danh -> truy cập URL công khai chứa UID hợp lệ -> Expect: hệ
// thống hiển thị đúng năm học và học kỳ gắn với UID mà không yêu cầu đăng
// nhập; danh sách chọn tuần hiển thị đầy đủ tất cả tuần của học kỳ.
//
// The shared Playwright `page` never logs in here — owner-side fixture
// setup uses loginApiOnly (a raw request) instead of loginUI — so visiting
// the public URL genuinely exercises the "no session at all" case.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_01");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);
  assert(published.isPublic && published.publicToken, "expected the timetable to come back isPublic with a publicToken");

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });

  assert(
    page.url().includes(`/public/timetable/${published.publicToken}`),
    `expected to land on the public page (no redirect to /login), got ${page.url()}`
  );

  const heading = await page.locator("h2").first().textContent();
  assert(
    heading.includes(`HK${semester1.semesterOrder}`) && heading.includes(year.name),
    `expected heading to show "HK${semester1.semesterOrder}" and "${year.name}", got "${heading}"`
  );

  // Grade + class selects render first, the week select is the last one on the page.
  const weekOptionCount = await page.locator("select").last().locator("option").count();
  assert(
    weekOptionCount === weeks.length,
    `expected the week selector to list all ${weeks.length} weeks, got ${weekOptionCount}`
  );
});
