// UC13-06 — Huỷ popup công bố [Abnormal]
// Steps: mở popup công bố -> chọn một số tuần hợp lệ -> chọn huỷ hoặc đóng
// popup mà không xác nhận -> Expect: hệ thống không thay đổi trạng thái
// công bố của bất kỳ tuần nào; URL và dữ liệu công khai hiện tại được giữ
// nguyên.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const { seedMinimalSchoolYear, scheduleWeekCompletely, weekCheckbox, openPublishDialog } = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_06");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);

  await weekCheckbox(dialog, weeks[0].weekNumber).check();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await dialog.waitFor({ state: "hidden", timeout: 3000 });

  const timetableRes = await fetch(`${API_URL}/api/timetables/${semester1.id}`, { headers: { Cookie: cookie } });
  const timetable = await timetableRes.json();
  assert(timetable.isPublic === false && timetable.publicToken === null, "expected the timetable to stay unpublished (no isPublic/publicToken) after closing without confirming");

  const statusRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish-status`, { headers: { Cookie: cookie } });
  const statuses = await statusRes.json();
  assert(statuses.every((s) => s.isPublished === false), "expected no week to have been published after closing the dialog without confirming");
});
