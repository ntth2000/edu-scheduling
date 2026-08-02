// UC01-01 — Đăng nhập thành công [Normal]
// Steps: đăng nhập với tài khoản hợp lệ -> Expect: chuyển hướng tới /timetable.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");

run(async (page) => {
  const { username, password } = await registerTestUser("uc01_01");

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/timetable**", { timeout: 8000 }).catch(() => {});

  assert(page.url().includes("/timetable"), `expected redirect to /timetable, got ${page.url()}`);
});
