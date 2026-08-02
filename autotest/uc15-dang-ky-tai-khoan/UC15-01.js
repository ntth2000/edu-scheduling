// UC15-01 — Đăng ký tài khoản thành công [Normal]
// Steps: nhập username mới, mật khẩu, xác nhận mật khẩu khớp -> Expect: tạo
// tài khoản, chuyển hướng tới /login.
const { run, assert, DEFAULT_PASSWORD, BASE_URL } = require("../_shared/helpers");

run(async (page) => {
  const username = `uc15_01_${Date.now()}`;

  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", DEFAULT_PASSWORD);
  await page.fill("#confirmPassword", DEFAULT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/login**", { timeout: 8000 }).catch(() => {});

  assert(page.url().includes("/login"), `expected redirect to /login, got ${page.url()}`);
});
