// UC15-05 — Mật khẩu xác nhận không khớp [Abnormal]
// Steps: username mới, mật khẩu và xác nhận mật khẩu khác nhau -> Expect:
// thông báo không khớp, không gửi request tạo tài khoản.
const { run, assert, DEFAULT_PASSWORD, BASE_URL } = require("../_shared/helpers");

const EXPECTED_MESSAGE = "Mật khẩu xác nhận không khớp";

run(async (page) => {
  let requestSent = false;
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/register")) requestSent = true;
  });

  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#username", `uc15_05_${Date.now()}`);
  await page.fill("#password", DEFAULT_PASSWORD);
  await page.fill("#confirmPassword", "DifferentPass1");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  assert(!requestSent, "expected no request to /api/auth/register when passwords mismatch");
  assert(page.url().includes("/register"), `expected to stay on /register, got ${page.url()}`);
  const errorText = (await page.locator(".bg-red-50").textContent().catch(() => null))?.trim();
  assert(errorText === EXPECTED_MESSAGE, `expected error "${EXPECTED_MESSAGE}", got "${errorText}"`);
});
