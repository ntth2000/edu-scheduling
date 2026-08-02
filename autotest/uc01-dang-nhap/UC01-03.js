// UC01-03 — Sai mật khẩu [Abnormal]
// Steps: đăng nhập với username hợp lệ nhưng sai mật khẩu -> Expect: thông
// báo lỗi, không tạo phiên đăng nhập.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");

const EXPECTED_MESSAGE = "Tên đăng nhập hoặc mật khẩu không đúng";

run(async (page, context) => {
  const { username } = await registerTestUser("uc01_03");

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", "wrongpassword");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  assert(page.url().includes("/login"), `expected to stay on /login, got ${page.url()}`);
  const errorText = (await page.locator(".bg-red-50").textContent().catch(() => null))?.trim();
  assert(errorText === EXPECTED_MESSAGE, `expected error "${EXPECTED_MESSAGE}", got "${errorText}"`);

  const cookies = await context.cookies();
  const hasSession = cookies.some((c) => c.name === "access_token");
  assert(!hasSession, "expected no access_token cookie to be set after failed login");
});
