// UC13-09 — Khoá thao tác chỉnh sửa tuần đã công bố trên giao diện [Abnormal]
// Steps: công bố một tuần đã hoàn thành -> mở lại tuần đó tại trang quản lý
// -> thử chọn ô, thêm, thay thế hoặc xoá tiết học -> kiểm tra các nút "Lưu
// tuần", "Áp dụng từ tuần N trở đi" và "Tự động xếp TKB" -> Expect: hệ
// thống hiển thị trạng thái tuần đã công bố và chuyển lưới sang chế độ chỉ
// đọc; các thao tác thay đổi nội dung và các nút có khả năng ghi đè dữ liệu
// đều bị vô hiệu hoá. Nội dung đã công bố được giữ nguyên.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const { seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks, cellLocator } = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_09");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, schoolClass, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const slots = await scheduleWeekCompletely(weeks[0].id, cookie);
  await publishWeeks(semester1.id, [weeks[0].id], cookie);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();
  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(2).selectOption({ label: `Tuần ${weeks[0].weekNumber} (chưa có ngày)` });
  // Switch from the default "Cả khối" (GradeView, a <table>) to the
  // single-class TimetableGrid so cellLocator's row/column layout applies.
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  await overlay.getByText(`Tuần ${weeks[0].weekNumber} đã công bố`, { exact: false }).waitFor({ timeout: 3000 });

  assert(await overlay.getByRole("button", { name: "Tự động xếp TKB" }).count() === 0, 'expected "Tự động xếp TKB" to be hidden while viewing a published week');
  assert(await overlay.getByRole("button", { name: /^Lưu tuần/ }).count() === 0, 'expected "Lưu tuần" to be hidden while viewing a published week');
  assert(await overlay.getByRole("button", { name: /^Áp dụng từ tuần/ }).count() === 0, 'expected "Áp dụng từ tuần ... trở đi" to be hidden while viewing a published week');

  const occupiedCell = cellLocator(overlay, slots[0].day, slots[0].period);
  await occupiedCell.click();
  await page.waitForTimeout(300);
  assert(await page.locator('[data-slot="popover-content"]').count() === 0, "expected clicking a slot in a published (read-only) week to not open the edit popover");

  const slotsAfter = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[0].id}`, { headers: { Cookie: cookie } })).json();
  assert(slotsAfter.length === slots.length, "expected the published week's content to be unchanged after the click attempt");
});
