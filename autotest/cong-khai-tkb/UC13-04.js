// UC13-04 — Công bố đồng thời nhiều tuần [Normal]
// Steps: chuẩn bị nhiều tuần đã xếp xong -> mở popup công bố -> chọn nhiều
// checkbox -> xác nhận -> Expect: tất cả tuần được chọn được công bố trong
// cùng thao tác; các tuần không được chọn giữ nguyên trạng thái.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const { seedMinimalSchoolYear, scheduleWeekCompletely, weekCheckbox, openPublishDialog } = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_04");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  await scheduleWeekCompletely(weeks[2].id, cookie);
  await scheduleWeekCompletely(weeks[4].id, cookie);
  // weeks[1] and weeks[3] stay untouched/ineligible -> unaffected reference points.

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);

  await weekCheckbox(dialog, weeks[0].weekNumber).check();
  await weekCheckbox(dialog, weeks[2].weekNumber).check();
  await weekCheckbox(dialog, weeks[4].weekNumber).check();
  await dialog.getByRole("button", { name: /^Công khai \(3\)$/ }).click();
  await page.getByText("Đã cập nhật công khai", { exact: true }).waitFor({ timeout: 5000 });

  const statusRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish-status`, { headers: { Cookie: cookie } });
  const statuses = await statusRes.json();
  for (const w of [weeks[0], weeks[2], weeks[4]]) {
    const s = statuses.find((x) => x.weekId === w.id);
    assert(s.isPublished === true, `expected week ${w.weekNumber} to be published`);
  }
  for (const w of [weeks[1], weeks[3]]) {
    const s = statuses.find((x) => x.weekId === w.id);
    assert(s.isPublished === false, `expected untouched week ${w.weekNumber} to stay unpublished`);
  }
});
