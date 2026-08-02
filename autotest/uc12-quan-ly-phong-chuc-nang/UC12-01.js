// UC12-01 — Xem danh sách phòng [Normal]
// Steps: truy cập Quản lý phòng chức năng -> Expect: hiển thị đúng tên,
// số lượng, môn liên kết của phòng hiện có.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc12_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);

  const subjects = await apiGet("/api/subjects", cookie);
  const subject = subjects[0];
  const room = await apiPost(
    "/api/special-rooms",
    { name: `Phòng Tin học ${Date.now()}`, quantity: 2, subjectId: subject.id },
    cookie
  );

  await page.goto(`${BASE_URL}/special-rooms`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const row = page.locator("table tbody tr", { hasText: room.name });
  assert(await row.count() > 0, `expected a row for room "${room.name}"`);
  const rowText = await row.first().textContent();
  assert(rowText.includes("2"), `expected quantity "2" in row, got "${rowText}"`);
  assert(rowText.includes(subject.name), `expected subject "${subject.name}" in row, got "${rowText}"`);
});
