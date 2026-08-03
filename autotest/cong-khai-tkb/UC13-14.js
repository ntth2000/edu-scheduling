// UC13-14 — Hủy công bố riêng một tuần [Normal]
// Steps: công bố ít nhất hai tuần trong cùng học kỳ và ghi nhận URL công
// khai -> tại một tuần, chọn "Hủy công bố" và xác nhận -> kiểm tra trạng
// thái quản lý và mở lại URL cũ -> chọn tuần vừa hủy và tuần còn công bố ->
// Expect: chỉ tuần được chọn chuyển sang trạng thái chưa công bố và có thể
// chỉnh sửa; các tuần còn lại vẫn được công bố. UID và URL học kỳ không
// đổi; tuần vừa hủy hiển thị lưới trống trên trang công khai, còn các tuần
// khác vẫn hiển thị dữ liệu.
//
// Note: the in-app action is a single click on the "Hủy công bố tuần này"
// banner button — there is no separate confirm step (unpublishing a week is
// reversible/low-risk, unlike deleting data), so this test clicks it once.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const {
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  cellLocator,
} = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_14");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  const slots2 = await scheduleWeekCompletely(weeks[2].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id, weeks[2].id], cookie);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();
  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(2).selectOption({ label: `Tuần ${weeks[0].weekNumber} (chưa có ngày)` });
  await overlay.getByRole("button", { name: "Hủy công bố tuần này" }).click();
  await page.getByText("Đã hủy công bố tuần này", { exact: true }).waitFor({ timeout: 5000 });

  const statusRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish-status`, { headers: { Cookie: cookie } });
  const statuses = await statusRes.json();
  assert(statuses.find((s) => s.weekId === weeks[0].id).isPublished === false, `expected week ${weeks[0].weekNumber} to become unpublished`);
  assert(statuses.find((s) => s.weekId === weeks[2].id).isPublished === true, `expected week ${weeks[2].weekNumber} to remain published`);

  const timetableRes = await fetch(`${API_URL}/api/timetables/${semester1.id}`, { headers: { Cookie: cookie } });
  const timetable = await timetableRes.json();
  assert(timetable.publicToken === published.publicToken, "expected the publicToken to be unchanged after unpublishing a single week");

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[0].weekNumber}` });
  await page.waitForTimeout(300);
  assert(!(await page.locator("body").textContent()).includes(subject.name), `expected week ${weeks[0].weekNumber} to render an empty grid after unpublishing`);

  await page.locator("select").last().selectOption({ label: `Tuần ${weeks[2].weekNumber}` });
  await page.waitForTimeout(300);
  const cellText = await cellLocator(page, slots2[0].day, slots2[0].period).textContent();
  assert(cellText.includes(subject.name), `expected week ${weeks[2].weekNumber} to still show data, got "${cellText}"`);
});
