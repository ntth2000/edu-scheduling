// UC13-08 — Tuần không được chọn vẫn không công bố [Abnormal]
// Steps: chuẩn bị hai tuần đã xếp xong -> trong popup chỉ chọn một tuần ->
// xác nhận công bố -> mở URL công khai và kiểm tra cả hai tuần -> Expect:
// tuần được chọn hiển thị dữ liệu; tuần không được chọn vẫn xuất hiện trong
// danh sách nhưng lưới để trống.
const { run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const {
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  weekCheckbox,
  openPublishDialog,
  cellLocator,
} = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_08");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const slots0 = await scheduleWeekCompletely(weeks[0].id, cookie);
  await scheduleWeekCompletely(weeks[2].id, cookie); // eligible, but left unticked below

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);
  await weekCheckbox(dialog, weeks[0].weekNumber).check();
  await dialog.getByRole("button", { name: /^Công khai \(1\)$/ }).click();
  const publishedUrl = await (async () => {
    await page.getByText("Đã cập nhật công khai", { exact: true }).waitFor({ timeout: 5000 });
    return dialog.locator("span[title]").getAttribute("title");
  })();
  const token = publishedUrl.split("/").pop();

  await page.goto(`${BASE_URL}/public/timetable/${token}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[0].weekNumber}` });
  await page.waitForTimeout(300);
  let cellText = await cellLocator(page, slots0[0].day, slots0[0].period).textContent();
  assert(cellText.includes(subject.name), `expected selected week ${weeks[0].weekNumber} to show data on the public page`);

  const optionTexts = (await page.locator("select").last().locator("option").allTextContents()).map((t) => t.trim());
  assert(optionTexts.includes(`Tuần ${weeks[2].weekNumber}`), `expected the not-selected (but eligible) week ${weeks[2].weekNumber} to still be listed`);
  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[2].weekNumber}` });
  await page.waitForTimeout(300);
  assert(!(await page.locator("body").textContent()).includes(subject.name), `expected week ${weeks[2].weekNumber} (eligible but never ticked) to render an empty grid`);
});
