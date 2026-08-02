// UC12-02 — Thêm phòng hợp lệ [Normal]
// Steps: mở form thêm phòng, nhập tên/số lượng/môn học, lưu -> Expect: phòng
// được lưu và xuất hiện trong danh sách với đúng thông tin.
const { run, assert, registerTestUser, loginUI, apiGet, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc12_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const subjects = await apiGet("/api/subjects", cookie);
  const subject = subjects[0];

  const roomName = `Phòng thí nghiệm ${Date.now()}`;

  await page.goto(`${BASE_URL}/special-rooms`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Thêm phòng chức năng" }).first().click();
  await page.fill("#room-name", roomName);
  await page.fill("#room-qty", "3");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: subject.name }).click();
  await page.getByRole("button", { name: "Thêm phòng" }).click();

  await page.waitForTimeout(1000);
  const successToast = page.getByText("Đã thêm phòng chức năng mới");
  assert(await successToast.count() > 0, "expected success toast after creating room");

  const row = page.locator("table tbody tr", { hasText: roomName });
  assert(await row.count() > 0, `expected new row for "${roomName}" in table`);
  const rowText = await row.first().textContent();
  assert(rowText.includes("3"), `expected quantity "3" in row, got "${rowText}"`);
  assert(rowText.includes(subject.name), `expected subject "${subject.name}" in row, got "${rowText}"`);
});
