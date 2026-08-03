// UC13-16 — Từ chối công bố lại tuần còn vi phạm ràng buộc bắt buộc [Abnormal]
// Steps: hủy công bố một tuần -> thay đổi dữ liệu hoặc tiết học để tạo vi
// phạm ràng buộc bắt buộc -> lưu trạng thái chỉnh sửa -> thử chọn tuần
// trong popup và công bố lại; đồng thời thử gọi trực tiếp API công bố ->
// Expect: giao diện không cho chọn tuần chưa đủ điều kiện hoặc hệ thống từ
// chối yêu cầu công bố với danh sách vi phạm. Tuần vẫn ở trạng thái chưa
// công bố và dữ liệu không xuất hiện trên URL công khai.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const {
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  weekCheckbox,
  openPublishDialog,
} = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_16");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const slots = await scheduleWeekCompletely(weeks[0].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  await fetch(`${API_URL}/api/timetables/${semester1.id}/weeks/${weeks[0].id}/unpublish`, { method: "POST", headers: { Cookie: cookie } });
  // Tạo vi phạm: xoá tiết duy nhất -> tuần trở lại trạng thái "chưa xếp xong".
  await fetch(`${API_URL}/api/slots/${slots[0].id}`, { method: "DELETE", headers: { Cookie: cookie } });

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);
  assert(await weekCheckbox(dialog, weeks[0].weekNumber).isDisabled(), `expected week ${weeks[0].weekNumber} to be disabled again (no longer fully scheduled)`);
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();

  const rejectRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ weekIds: [weeks[0].id] }),
  });
  assert(rejectRes.status === 400, `expected re-publishing the now-incomplete week to be rejected (400), got HTTP ${rejectRes.status}`);

  const statusRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish-status`, { headers: { Cookie: cookie } });
  const status = (await statusRes.json()).find((s) => s.weekId === weeks[0].id);
  assert(status.isPublished === false, `expected week ${weeks[0].weekNumber} to stay unpublished`);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });
  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[0].weekNumber}` });
  await page.waitForTimeout(300);
  assert(!(await page.locator("body").textContent()).includes(subject.name), `expected week ${weeks[0].weekNumber} to show no data on the public page`);
});
