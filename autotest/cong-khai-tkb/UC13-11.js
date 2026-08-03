// UC13-11 — Không cho xếp tự động tuần đã công bố [Abnormal]
// Steps: công bố một tuần đã hoàn thành -> ghi nhận nội dung hiện tại -> thử
// thực hiện "Tự động xếp TKB" qua giao diện và gọi trực tiếp API tạo
// phương án -> tải lại tuần -> Expect: hệ thống từ chối xếp tự động và
// thông báo phải hủy công bố trước; nội dung tuần đã công bố không thay đổi
// và không xuất hiện kết quả chưa lưu.
const { API_URL, run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const { seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_11");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const originalSlots = await scheduleWeekCompletely(weeks[0].id, cookie);
  await publishWeeks(semester1.id, [weeks[0].id], cookie);

  // Giao diện: nút "Tự động xếp TKB" không còn xuất hiện khi xem tuần đã công bố.
  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();
  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(2).selectOption({ label: `Tuần ${weeks[0].weekNumber} (chưa có ngày)` });
  assert(
    (await overlay.getByRole("button", { name: "Tự động xếp TKB" }).count()) === 0,
    'expected "Tự động xếp TKB" to not be offered while viewing a published week'
  );

  // API: gọi thẳng endpoint sinh phương án tự động cho tuần đã công bố.
  const generateRes = await fetch(`${API_URL}/api/weeks/${weeks[0].id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  assert(generateRes.status === 409, `expected auto-scheduling a published week to be rejected (409), got HTTP ${generateRes.status}`);
  const body = await generateRes.json().catch(() => ({}));
  assert(/công bố/.test(body.message || ""), `expected the rejection message to mention "công bố", got ${JSON.stringify(body)}`);

  const reload = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[0].id}`, { headers: { Cookie: cookie } })).json();
  assert(reload.length === originalSlots.length, "expected the published week's content to stay unchanged after the rejected auto-schedule attempt");
});
