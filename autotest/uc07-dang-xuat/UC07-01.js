// UC07-01 — Đăng xuất thành công [Normal]
// Steps: đang đăng nhập, chọn Đăng xuất, chờ xử lý, thử quay lại một trang
// quản lý -> Expect: hệ thống thu hồi phiên, xoá token xác thực trên trình
// duyệt, chuyển về trang đăng nhập; trang quản lý không còn truy cập được
// bằng phiên cũ.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  BASE_URL,
  API_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc07_01");
  await loginUI(page, username, password);

  const cookiesBefore = await context.cookies();
  const refreshTokenBefore = cookiesBefore.find((c) => c.name === "refresh_token")?.value;
  assert(refreshTokenBefore, "expected a refresh_token cookie after login");

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL("**/login**", { timeout: 8000 });
  assert(page.url().includes("/login"), `expected redirect to /login, got ${page.url()}`);

  const cookiesAfter = await context.cookies();
  const accessTokenAfter = cookiesAfter.find((c) => c.name === "access_token")?.value;
  const refreshTokenAfter = cookiesAfter.find((c) => c.name === "refresh_token")?.value;
  assert(!accessTokenAfter, "expected access_token cookie to be cleared after logout");
  assert(!refreshTokenAfter, "expected refresh_token cookie to be cleared after logout");

  // The old session must be revoked server-side, not just cleared client-side.
  const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshTokenBefore }),
  });
  assert(
    refreshRes.status === 401,
    `expected the old refresh token to be revoked (401), got HTTP ${refreshRes.status}`
  );

  // A protected page must not be reachable anymore with the (now-cleared) old session.
  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  assert(page.url().includes("/login"), `expected /teachers to redirect back to /login, got ${page.url()}`);
});
