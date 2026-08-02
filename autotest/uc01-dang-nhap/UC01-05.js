// UC01-05 — Bỏ trống mật khẩu [Abnormal]
// Steps: nhập username, để trống mật khẩu, nhấn Đăng nhập -> Expect: thông
// báo tiếng Việt yêu cầu nhập đầy đủ thông tin, không gửi request, vẫn ở /login.
const { run, assert, BASE_URL } = require("../_shared/helpers");

const EXPECTED_MESSAGE = "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.";

run(async (page) => {
  let requestSent = false;
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/login")) requestSent = true;
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", `uc01_05_${Date.now()}`);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);

  assert(!requestSent, "expected no request to /api/auth/login when password is empty");
  assert(page.url().includes("/login"), `expected to stay on /login, got ${page.url()}`);
  const errorText = (await page.locator(".bg-red-50").textContent().catch(() => null))?.trim();
  assert(errorText === EXPECTED_MESSAGE, `expected error "${EXPECTED_MESSAGE}", got "${errorText}"`);
});
