// UC15-04 — Tên đăng nhập đã tồn tại [Abnormal]
// Steps: đăng ký với username đã tồn tại -> Expect: thông báo trùng tên,
// không tạo tài khoản trùng, vẫn ở /register.
const { run, assert, registerTestUser, DEFAULT_PASSWORD, BASE_URL } = require("../_shared/helpers");

const EXPECTED_MESSAGE = "Tên đăng nhập đã tồn tại";

run(async (page) => {
  const { username } = await registerTestUser("uc15_04");

  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", DEFAULT_PASSWORD);
  await page.fill("#confirmPassword", DEFAULT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  assert(page.url().includes("/register"), `expected to stay on /register, got ${page.url()}`);
  const errorText = (await page.locator(".bg-red-50").textContent().catch(() => null))?.trim();
  assert(errorText === EXPECTED_MESSAGE, `expected error "${EXPECTED_MESSAGE}", got "${errorText}"`);
});
