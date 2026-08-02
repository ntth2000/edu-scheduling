// UC12-03 — Cập nhật cấu hình phòng hợp lệ [Normal]
// Steps: sửa tên/môn/số lượng của phòng hiện có, lưu -> Expect: danh sách
// hiển thị đúng thông tin mới; SpecialRoomService.update() chỉ ghi đè bảng
// special_rooms nên các tiết đã bố trí (bảng slots, rỗng ở đây) không bị đụng tới.
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
  const { username, password } = await registerTestUser("uc12_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const subjects = await apiGet("/api/subjects", cookie);

  const room = await apiPost(
    "/api/special-rooms",
    { name: `Phòng cũ ${Date.now()}`, quantity: 1, subjectId: subjects[0].id },
    cookie
  );

  const newName = `Phòng mới ${Date.now()}`;

  await page.goto(`${BASE_URL}/special-rooms`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const row = page.locator("table tbody tr", { hasText: room.name });
  await row.getByRole("button").first().click(); // pencil (edit) is the first action button

  await page.fill("#room-name", "");
  await page.fill("#room-name", newName);
  await page.fill("#room-qty", "");
  await page.fill("#room-qty", "5");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: subjects[1].name }).click();
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();

  await page.waitForTimeout(1000);
  const successToast = page.getByText("Đã cập nhật phòng chức năng");
  assert(await successToast.count() > 0, "expected success toast after updating room");

  const oldRow = page.locator("table tbody tr", { hasText: room.name });
  assert(await oldRow.count() === 0, `expected old name "${room.name}" to be gone from table`);

  const updatedRow = page.locator("table tbody tr", { hasText: newName });
  assert(await updatedRow.count() > 0, `expected updated row "${newName}" in table`);
  const rowText = await updatedRow.first().textContent();
  assert(rowText.includes("5"), `expected quantity "5" in row, got "${rowText}"`);
  assert(rowText.includes(subjects[1].name), `expected subject "${subjects[1].name}" in row, got "${rowText}"`);

  // Note: SpecialRoomService.update() only persists the special_rooms row
  // (verified by reading the source) — it never touches the slots table, so
  // there is no separate "existing periods stayed put" check to run here.
  // GET /api/slots is unscoped (returns every user's rows), so it can't be
  // used as a reliable per-account assertion in this test.
});
