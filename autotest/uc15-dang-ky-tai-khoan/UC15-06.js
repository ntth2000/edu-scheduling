// UC15-06 — Bỏ trống tên đăng nhập [Abnormal]
// Steps: để trống username, nhập mật khẩu + xác nhận -> Expect: thông báo
// tiếng Việt yêu cầu nhập đầy đủ, không gửi request, vẫn ở /register.
const { run, assert, DEFAULT_PASSWORD, BASE_URL } = require("../_shared/helpers");

const EXPECTED_MESSAGE = "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và xác nhận mật khẩu.";

run(async (page) => {
  let requestSent = false;
  page.on("request", (req) => {
    if (req.url().includes("/api/auth/register")) requestSent = true;
  });

  await page.goto(`${BASE_URL}/register`, { waitUntil: "networkidle" });
  await page.fill("#password", DEFAULT_PASSWORD);
  await page.fill("#confirmPassword", DEFAULT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);

  assert(!requestSent, "expected no request to /api/auth/register when username is empty");
  assert(page.url().includes("/register"), `expected to stay on /register, got ${page.url()}`);
  const errorText = (await page.locator(".bg-red-50").textContent().catch(() => null))?.trim();
  assert(errorText === EXPECTED_MESSAGE, `expected error "${EXPECTED_MESSAGE}", got "${errorText}"`);
});
