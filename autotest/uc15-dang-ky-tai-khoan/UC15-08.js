// UC15-08 — Không thể kết nối máy chủ khi đăng ký [Abnormal]
// Steps: mô phỏng lỗi mạng bằng cách chặn request /api/auth/register ->
// Expect: thông báo không thể kết nối, vẫn ở /register.
const { run, assert, DEFAULT_PASSWORD, BASE_URL } = require("../_shared/helpers");

const EXPECTED_MESSAGE = "Không thể kết nối đến máy chủ";

run(async (page) => {
  await page.route("**/api/auth/register", (route) => route.abort("connectionrefused"));

  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#username", `uc15_08_${Date.now()}`);
  await page.fill("#password", DEFAULT_PASSWORD);
  await page.fill("#confirmPassword", DEFAULT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  assert(page.url().includes("/register"), `expected to stay on /register, got ${page.url()}`);
  const errorText = (await page.locator(".bg-red-50").textContent().catch(() => null))?.trim();
  assert(errorText === EXPECTED_MESSAGE, `expected error "${EXPECTED_MESSAGE}", got "${errorText}"`);
});
