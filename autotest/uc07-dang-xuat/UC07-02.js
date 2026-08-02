// UC07-02 — Đăng xuất khi phiên đã hết hạn [Abnormal]
// Steps: dùng phiên đã hết hạn, chọn Đăng xuất hoặc truy cập lại hệ thống ->
// Expect: hệ thống xoá thông tin xác thực còn lại và chuyển về trang đăng
// nhập, không phát sinh lỗi làm kẹt giao diện.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  BASE_URL,
  API_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc07_02");
  await loginUI(page, username, password);

  // Simulate an expired session: overwrite both auth cookies with values
  // that don't correspond to any valid/existing token.
  await context.addCookies([
    { name: "access_token", value: "expired.invalid.token", domain: "localhost", path: "/" },
    { name: "refresh_token", value: "expired-refresh-token", domain: "localhost", path: "/" },
  ]);

  // Revisiting the system with an expired session must not hard-crash the UI —
  // the app shell (sidebar with the Đăng xuất button) must still render.
  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });
  const logoutButton = page.getByRole("button", { name: "Đăng xuất" });
  assert(
    await logoutButton.count() === 1,
    "expected the app shell to still render (with a working Đăng xuất button) on an expired session"
  );

  await logoutButton.click();
  await page.waitForURL("**/login**", { timeout: 8000 });
  assert(page.url().includes("/login"), `expected redirect to /login, got ${page.url()}`);

  const cookiesAfter = await context.cookies();
  assert(
    !cookiesAfter.some((c) => c.name === "access_token" && c.value),
    "expected access_token cookie to be cleared"
  );
  assert(
    !cookiesAfter.some((c) => c.name === "refresh_token" && c.value),
    "expected refresh_token cookie to be cleared"
  );

  // Calling logout server-side with an already-invalid refresh token must stay
  // graceful (no server error) instead of jamming the flow.
  const logoutRes = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: "refresh_token=garbage-token-does-not-exist" },
  });
  assert(
    logoutRes.status < 500,
    `expected graceful handling of an invalid refresh token on logout, got HTTP ${logoutRes.status}`
  );
});
