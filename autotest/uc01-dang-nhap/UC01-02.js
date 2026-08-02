// UC01-02 — Sai tên đăng nhập [Abnormal]
// Steps: đăng nhập với username không tồn tại -> Expect: thông báo lỗi chung,
// vẫn ở /login. (AuthController gộp lỗi sai-username/sai-password thành 1
// thông báo để không lộ việc username có tồn tại hay không.)
const { run, assert, BASE_URL } = require("../_shared/helpers");

const EXPECTED_MESSAGE = "Tên đăng nhập hoặc mật khẩu không đúng";

run(async (page) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", `no_such_user_${Date.now()}`);
  await page.fill("#password", "whatever123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  assert(page.url().includes("/login"), `expected to stay on /login, got ${page.url()}`);
  const errorText = (await page.locator(".bg-red-50").textContent().catch(() => null))?.trim();
  assert(errorText === EXPECTED_MESSAGE, `expected error "${EXPECTED_MESSAGE}", got "${errorText}"`);
});
