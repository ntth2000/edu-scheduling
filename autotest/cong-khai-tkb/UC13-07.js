// UC13-07 — Không có tuần đủ điều kiện công bố [Abnormal]
// Steps: chuẩn bị học kỳ mà tất cả tuần đều chưa xếp xong -> mở popup công
// bố -> Expect: tất cả checkbox đều disable; hệ thống không cho xác nhận
// công bố và thông báo chưa có tuần hoàn thành để công bố.
const { run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const { seedMinimalSchoolYear, weekCheckbox, openPublishDialog } = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_07");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  // No week is scheduled -> nothing is eligible.

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);

  const sample = [weeks[0], weeks[1], weeks[weeks.length - 1]];
  for (const w of sample) {
    assert(await weekCheckbox(dialog, w.weekNumber).isDisabled(), `expected week ${w.weekNumber}'s checkbox to be disabled`);
  }

  const confirmBtn = dialog.getByRole("button", { name: "Thu hồi công khai", exact: true });
  assert(await confirmBtn.isDisabled(), 'expected the confirm button ("Thu hồi công khai" — 0 selected, nothing currently public) to be disabled since there is nothing to publish or revoke');
});
