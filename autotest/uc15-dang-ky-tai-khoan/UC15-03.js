// UC15-03 — Chuyển sang trang đăng nhập [Normal]
// Steps: mở trang đăng ký, bấm liên kết "Đăng nhập tại đây" -> Expect:
// chuyển sang /login, không tạo tài khoản.
const { run, assert, BASE_URL } = require("../_shared/helpers");

run(async (page) => {
  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.click('a:has-text("Đăng nhập tại đây")');
  await page.waitForTimeout(500);

  assert(page.url().includes("/login"), `expected navigation to /login, got ${page.url()}`);
});
