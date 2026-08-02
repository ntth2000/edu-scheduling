// UC12-05 — Dữ liệu phòng không hợp lệ [Abnormal]
// Steps: để trống tên hoặc nhập số lượng không hợp lệ, lưu -> Expect: thông
// báo lỗi, không lưu thay đổi (modal vẫn mở, không có phòng mới trong bảng).
const { run, assert, registerTestUser, loginUI, BASE_URL } = require("../_shared/helpers");

run(async (page) => {
  const { username, password } = await registerTestUser("uc12_05");
  await loginUI(page, username, password);

  await page.goto(`${BASE_URL}/special-rooms`, { waitUntil: "networkidle" });

  // Case 1: empty name
  await page.getByRole("button", { name: "Thêm phòng chức năng" }).first().click();
  await page.fill("#room-qty", "2");
  await page.getByRole("button", { name: "Thêm phòng" }).click();
  await page.waitForTimeout(500);
  assert(
    await page.getByText("Tên phòng không được để trống").count() > 0,
    "expected toast for empty room name"
  );
  assert(await page.locator('[role="dialog"]').isVisible(), "expected modal to stay open after invalid submit");

  // Case 2: invalid quantity (0)
  await page.fill("#room-name", `Phòng không hợp lệ ${Date.now()}`);
  await page.fill("#room-qty", "0");
  await page.getByRole("button", { name: "Thêm phòng" }).click();
  await page.waitForTimeout(500);
  assert(
    await page.getByText("Số lượng phải >= 1").count() > 0,
    "expected toast for invalid quantity"
  );
  assert(await page.locator('[role="dialog"]').isVisible(), "expected modal to stay open after invalid submit");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const rows = await page.locator("table tbody tr").count().catch(() => 0);
  assert(rows === 0, `expected no room to have been created, found ${rows} row(s)`);
});
