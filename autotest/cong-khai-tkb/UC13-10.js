// UC13-10 — API từ chối sửa dữ liệu của tuần đã công bố [Abnormal]
// Steps: ghi nhận toàn bộ tiết học của một tuần đã công bố -> gọi trực tiếp
// các API thêm, thay thế hoặc xoá tiết của tuần đó bằng tài khoản có quyền
// quản lý -> tải lại dữ liệu tuần -> Expect: tất cả yêu cầu thay đổi bị từ
// chối với thông báo tuần đã công bố và cần hủy công bố trước khi chỉnh
// sửa; không có tiết nào bị thêm, thay thế hoặc xoá.
const { API_URL, run, assert, registerTestUser } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async () => {
  const { username, password } = await registerTestUser("uc13_10");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, weeks, assignment } = await seedMinimalSchoolYear(cookie, suffix);
  const originalSlots = await scheduleWeekCompletely(weeks[0].id, cookie);
  await publishWeeks(semester1.id, [weeks[0].id], cookie);

  // Thêm (add a new slot into an untouched cell of the published week).
  const addRes = await fetch(`${API_URL}/api/slots`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ weekId: weeks[0].id, assignmentId: assignment.id, day: 3, session: 1, period: 2 }),
  });
  assert(addRes.status === 409, `expected adding a slot to the published week to be rejected (409), got HTTP ${addRes.status}`);
  const addBody = await addRes.json().catch(() => ({}));
  assert(/công bố/.test(addBody.message || ""), `expected the rejection message to mention "công bố", got ${JSON.stringify(addBody)}`);

  // Thay thế (upsert to the same day/period/class — SlotService treats this as an update).
  const replaceRes = await fetch(`${API_URL}/api/slots`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      weekId: weeks[0].id,
      assignmentId: assignment.id,
      day: originalSlots[0].day,
      session: originalSlots[0].session,
      period: originalSlots[0].period,
    }),
  });
  assert(replaceRes.status === 409, `expected replacing a slot in the published week to be rejected (409), got HTTP ${replaceRes.status}`);

  // Xoá.
  const deleteRes = await fetch(`${API_URL}/api/slots/${originalSlots[0].id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert(deleteRes.status === 409, `expected deleting a slot in the published week to be rejected (409), got HTTP ${deleteRes.status}`);
  const deleteBody = await deleteRes.json().catch(() => ({}));
  assert(/công bố/.test(deleteBody.message || ""), `expected the rejection message to mention "công bố", got ${JSON.stringify(deleteBody)}`);

  const reload = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[0].id}`, { headers: { Cookie: cookie } })).json();
  assert(reload.length === originalSlots.length, `expected the week's slot count to stay ${originalSlots.length}, got ${reload.length}`);
  assert(reload.some((s) => s.id === originalSlots[0].id), "expected the original slot to still exist, untouched");
});
