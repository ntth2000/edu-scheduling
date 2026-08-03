// UC13-01 — Hiển thị popup chọn tuần công bố [Normal]
// Steps: mở TKB của một học kỳ -> chọn "Công khai thời khoá biểu" ->
// Expect: hệ thống hiển thị popup chứa đầy đủ các tuần của học kỳ dưới
// dạng checkbox; mỗi tuần thể hiện rõ trạng thái đã xếp xong, chưa xếp
// xong hoặc đã công bố.
const { run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const {
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  weekCheckbox,
  openPublishDialog,
} = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie); // eligible, will be published
  await publishWeeks(semester1.id, [weeks[0].id], cookie);
  // weeks[1] left untouched -> not eligible ("chưa xếp xong")

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);

  const checkboxCount = await dialog.getByRole("checkbox").count();
  assert(checkboxCount === weeks.length, `expected ${weeks.length} checkboxes (one per week), got ${checkboxCount}`);

  const publishedBox = weekCheckbox(dialog, weeks[0].weekNumber);
  assert(await publishedBox.isChecked(), `expected the already-published week ${weeks[0].weekNumber} to be pre-checked`);
  assert(await publishedBox.isEnabled(), `expected the already-published week ${weeks[0].weekNumber}'s checkbox to stay enabled`);

  const incompleteBox = weekCheckbox(dialog, weeks[1].weekNumber);
  assert(!(await incompleteBox.isChecked()), `expected the incomplete week ${weeks[1].weekNumber} to be unchecked`);
  assert(await incompleteBox.isDisabled(), `expected the incomplete week ${weeks[1].weekNumber}'s checkbox to be disabled`);
});
