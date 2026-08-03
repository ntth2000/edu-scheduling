// UC13-12 — Áp dụng từ tuần N không ghi đè tuần đã công bố [Normal]
// Steps: chuẩn bị một chuỗi tuần từ N trở đi gồm cả tuần đã công bố và chưa
// công bố -> chỉnh sửa tuần N chưa công bố -> chọn "Áp dụng từ tuần N trở
// đi" và xác nhận -> kiểm tra từng tuần trong phạm vi áp dụng.
//
// Quyết định cuối (đã chốt với người dùng, không còn là mismatch cần bàn):
// `WeekService.applyFromWeek` từ chối NGUYÊN KHỐI thao tác (409) nếu bất kỳ
// tuần nào trong phạm vi áp dụng đã công bố, thay vì âm thầm áp dụng chọn
// lọc và bỏ qua riêng các tuần đã công bố — đơn giản/an toàn hơn (không có
// rủi ro áp dụng nửa chừng). Đổi lại, message lỗi phải nêu rõ tuần nguồn,
// liệt kê đúng các tuần đang khoá, và gợi ý hướng xử lý (hủy công bố hoặc chỉ
// lưu riêng tuần nguồn) — test này khẳng định đúng nội dung message đó.
const { API_URL, run, assert, registerTestUser } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async () => {
  const { username, password } = await registerTestUser("uc13_12");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  // N = weeks[1]; weeks[2] và weeks[3] (> N) đã công bố và không được đụng tới.
  await scheduleWeekCompletely(weeks[1].id, cookie);
  await scheduleWeekCompletely(weeks[2].id, cookie);
  await scheduleWeekCompletely(weeks[3].id, cookie);
  await publishWeeks(semester1.id, [weeks[2].id, weeks[3].id], cookie);
  const week2SlotsBefore = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[2].id}`, { headers: { Cookie: cookie } })).json();
  const week3SlotsBefore = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[3].id}`, { headers: { Cookie: cookie } })).json();

  const applyRes = await fetch(`${API_URL}/api/weeks/${weeks[1].id}/apply-forward`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert(applyRes.status === 409, `expected apply-forward to be rejected (409) when later weeks are published, got HTTP ${applyRes.status}`);
  const body = await applyRes.json().catch(() => ({}));
  const expectedMessage =
    `Không thể áp dụng thay đổi từ tuần ${weeks[1].weekNumber}\n` +
    `Tuần ${weeks[2].weekNumber} và tuần ${weeks[3].weekNumber} đã được công bố và đang bị khóa. ` +
    `Vui lòng hủy công bố các tuần này trước khi áp dụng thay đổi, hoặc chỉ lưu thay đổi cho tuần ${weeks[1].weekNumber}.`;
  assert(body.message === expectedMessage, `expected rejection message:\n"${expectedMessage}"\ngot:\n"${body.message}"`);

  const week2SlotsAfter = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[2].id}`, { headers: { Cookie: cookie } })).json();
  const week3SlotsAfter = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[3].id}`, { headers: { Cookie: cookie } })).json();
  assert(
    week2SlotsAfter.length === week2SlotsBefore.length && week2SlotsAfter.every((s) => week2SlotsBefore.some((b) => b.id === s.id)) &&
      week3SlotsAfter.length === week3SlotsBefore.length && week3SlotsAfter.every((s) => week3SlotsBefore.some((b) => b.id === s.id)),
    "expected both published weeks' slots to be completely unchanged after the rejected apply-forward"
  );
});
