// UC13-15 — Chỉnh sửa và công bố lại tuần hợp lệ [Normal]
// Steps: hủy công bố riêng một tuần -> thực hiện chỉnh sửa nội dung tuần và
// lưu -> xử lý hết các vi phạm ràng buộc bắt buộc -> mở popup công bố và
// chọn lại tuần đó -> xác nhận công bố rồi mở URL cũ -> Expect: sau khi hủy
// công bố, tuần cho phép chỉnh sửa bình thường. Khi thời khóa biểu hợp lệ,
// hệ thống công bố lại thành công trên UID và URL cũ; trang công khai hiển
// thị đúng nội dung mới.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const {
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  weekCheckbox,
  openPublishDialog,
  cellLocator,
} = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_15");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const originalSlots = await scheduleWeekCompletely(weeks[0].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  // Hủy công bố riêng tuần này (qua API — luồng UI đã được UC13-14 kiểm chứng).
  const unpublishRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/weeks/${weeks[0].id}/unpublish`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert(unpublishRes.status === 204, `expected unpublishWeek to succeed (204), got HTTP ${unpublishRes.status}`);

  // Chỉnh sửa: xoá tiết cũ (giờ cho phép vì tuần đã hết công bố) rồi xếp lại.
  const deleteRes = await fetch(`${API_URL}/api/slots/${originalSlots[0].id}`, { method: "DELETE", headers: { Cookie: cookie } });
  assert(deleteRes.status === 204, `expected deleting the slot in the now-unpublished week to succeed, got HTTP ${deleteRes.status}`);
  const newSlots = await scheduleWeekCompletely(weeks[0].id, cookie);
  assert(newSlots.length === 1, "expected the week to be fully re-scheduled with exactly one slot");

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);
  const box = weekCheckbox(dialog, weeks[0].weekNumber);
  assert(await box.isEnabled(), `expected week ${weeks[0].weekNumber} to be eligible again after being re-scheduled`);
  await box.check();
  // `isPublic` stayed true across the unpublishWeek call above (it only
  // clears the single week's own flag, not the timetable-wide switch — see
  // TimetableService#unpublishWeek), so the button reads "Cập nhật" here,
  // not "Công khai".
  await dialog.getByRole("button", { name: /^Cập nhật \(1\)$/ }).click();
  await page.getByText("Đã cập nhật công khai", { exact: true }).waitFor({ timeout: 5000 });
  const shownUrl = await dialog.locator("span[title]").getAttribute("title");
  assert(shownUrl.includes(published.publicToken), `expected re-publishing to reuse the original token "${published.publicToken}", got "${shownUrl}"`);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });
  const cellText = await cellLocator(page, newSlots[0].day, newSlots[0].period).textContent();
  assert(cellText.includes(subject.name), `expected the public page to show the newly re-scheduled slot, got "${cellText}"`);
});
