// UC12-04 — Xoá phòng không được sử dụng [Normal]
// Steps: chọn phòng chưa dùng trong TKB, xoá và xác nhận -> Expect: phòng
// bị xoá khỏi danh sách.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc12_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);

  const room = await apiPost(
    "/api/special-rooms",
    { name: `Phòng sẽ xoá ${Date.now()}`, quantity: 1, subjectId: null },
    cookie
  );

  await page.goto(`${BASE_URL}/special-rooms`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const row = page.locator("table tbody tr", { hasText: room.name });
  assert(await row.count() > 0, `expected row for "${room.name}" before delete`);
  const buttons = row.getByRole("button");
  await buttons.nth(1).click(); // trash icon is the second action button

  await page.getByRole("alertdialog").getByRole("button", { name: "Xóa" }).click();
  await page.waitForTimeout(1000);

  const successToast = page.getByText(`Đã xóa phòng ${room.name}`);
  assert(await successToast.count() > 0, "expected success toast after deleting room");

  const rowAfter = page.locator("table tbody tr", { hasText: room.name });
  assert(await rowAfter.count() === 0, `expected "${room.name}" to be gone from table`);
});
