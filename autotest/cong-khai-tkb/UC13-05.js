// UC13-05 — Công bố thêm tuần nhưng giữ nguyên URL học kỳ [Normal]
// Steps: ghi nhận URL sau lần công bố đầu tiên -> hoàn thành thêm một tuần
// khác -> mở popup, chọn tuần mới và xác nhận công bố -> so sánh URL trước
// và sau -> Expect: tuần mới được công bố nhưng UID và URL của học kỳ vẫn
// giữ nguyên; không sinh URL riêng cho từng tuần.
const { run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const {
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  weekCheckbox,
  openPublishDialog,
} = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_05");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  const firstPublish = await publishWeeks(semester1.id, [weeks[0].id], cookie);
  const originalToken = firstPublish.publicToken;

  await scheduleWeekCompletely(weeks[2].id, cookie);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);

  // Reopening the dialog should pre-check the already-published week; keep
  // it checked (publish() replaces the whole set) and additionally tick the
  // newly completed week.
  assert(await weekCheckbox(dialog, weeks[0].weekNumber).isChecked(), `expected week ${weeks[0].weekNumber} to be pre-checked on reopen`);
  await weekCheckbox(dialog, weeks[2].weekNumber).check();
  await dialog.getByRole("button", { name: /^Cập nhật \(2\)$/ }).click();
  await page.getByText("Đã cập nhật công khai", { exact: true }).waitFor({ timeout: 5000 });

  const shownUrl = await dialog.locator("span[title]").getAttribute("title");
  assert(shownUrl && shownUrl.includes(originalToken), `expected the shown URL to still contain the original token "${originalToken}", got "${shownUrl}"`);
});
