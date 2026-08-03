// UC13-03 — Công bố một số tuần đã hoàn thành [Normal]
// Steps: mở popup công bố -> chọn checkbox của một hoặc nhiều tuần đã xếp
// xong -> không chọn các tuần còn lại -> xác nhận công bố -> Expect: chỉ
// các tuần được chọn chuyển sang trạng thái đã công bố; hệ thống sinh hoặc
// duy trì một UID và URL công khai đại diện cho toàn bộ học kỳ.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const { seedMinimalSchoolYear, scheduleWeekCompletely, weekCheckbox, openPublishDialog } = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_03");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie); // eligible, will be published
  await scheduleWeekCompletely(weeks[2].id, cookie); // eligible, left unchecked

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);

  await weekCheckbox(dialog, weeks[0].weekNumber).check();
  await dialog.getByRole("button", { name: /^Công khai \(1\)$/ }).click();
  await page.getByText("Đã cập nhật công khai", { exact: true }).waitFor({ timeout: 5000 });

  const statusRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish-status`, { headers: { Cookie: cookie } });
  const statuses = await statusRes.json();
  const selectedStatus = statuses.find((s) => s.weekId === weeks[0].id);
  const otherEligibleStatus = statuses.find((s) => s.weekId === weeks[2].id);
  assert(selectedStatus.isPublished === true, `expected week ${weeks[0].weekNumber} to be published`);
  assert(otherEligibleStatus.isPublished === false, `expected week ${weeks[2].weekNumber} (eligible but not ticked) to stay unpublished`);

  const timetableRes = await fetch(`${API_URL}/api/timetables/${semester1.id}`, { headers: { Cookie: cookie } });
  const timetable = await timetableRes.json();
  assert(timetable.isPublic === true && typeof timetable.publicToken === "string" && timetable.publicToken.length > 0, "expected the timetable to have isPublic=true and a publicToken");
});
