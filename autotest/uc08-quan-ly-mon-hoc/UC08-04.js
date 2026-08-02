// UC08-04 — Xoá môn không có dữ liệu liên quan [Normal]
// Steps: chọn môn chưa có dữ liệu liên quan, xoá, xác nhận -> Expect: môn bị
// xoá và không còn xuất hiện trong danh sách.
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
  const { username, password } = await registerTestUser("uc08_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();
  const subject = await apiPost(
    "/api/subjects",
    {
      name: `Môn UC0804 ${suffix}`,
      periodsGrade1: 1,
      periodsGrade2: 1,
      periodsGrade3: 1,
      periodsGrade4: 1,
      periodsGrade5: 1,
    },
    cookie
  );

  await page.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });
  const row = page.locator("table tbody tr", { hasText: subject.name });
  await row.locator("button").nth(1).click(); // trash = delete

  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Xóa", exact: true }).click();

  await page.getByText(`Đã xóa môn học ${subject.name}`, { exact: true }).waitFor({ timeout: 3000 });
  assert(
    await page.locator("table tbody tr", { hasText: subject.name }).count() === 0,
    `expected subject row "${subject.name}" to be removed from the table`
  );

  const subjects = await apiGet("/api/subjects", cookie);
  assert(!subjects.some((s) => s.id === subject.id), "expected subject to be deleted from the API");
});
