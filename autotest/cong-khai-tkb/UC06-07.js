// UC06-07 — Tuần chưa xếp xong trên URL công khai [Abnormal]
// Steps: chuẩn bị một tuần chưa xếp xong và không được phép công bố -> mở
// URL công khai của học kỳ -> chọn tuần đó -> Expect: tuần vẫn xuất hiện
// trong danh sách của học kỳ nhưng nội dung TKB để trống; dữ liệu đang
// chỉnh sửa không được hiển thị.
const { API_URL, run, assert, registerTestUser } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_07");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  // weeks[1]: never scheduled -> "chưa xếp xong" -> must be rejected by publish.
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  const statusRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish-status`, { headers: { Cookie: cookie } });
  const statuses = await statusRes.json();
  const incomplete = statuses.find((s) => s.weekId === weeks[1].id);
  assert(incomplete && incomplete.eligible === false, `expected week ${weeks[1].weekNumber} to be ineligible (not fully scheduled)`);

  const rejectRes = await fetch(`${API_URL}/api/timetables/${semester1.id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ weekIds: [weeks[1].id] }),
  });
  assert(rejectRes.status === 400, `expected publishing the incomplete week to be rejected (400), got HTTP ${rejectRes.status}`);

  // Public API must not leak the in-progress (unscheduled, unpublished) week's slots.
  const publicSlotsRes = await fetch(`${API_URL}/api/public/timetables/${published.publicToken}/slots?weekId=${weeks[1].id}`);
  assert(publicSlotsRes.status === 200, `expected 200 (empty grid, not an error) for the unpublished week's public slots, got ${publicSlotsRes.status}`);
  const publicSlots = await publicSlotsRes.json();
  assert(Array.isArray(publicSlots) && publicSlots.length === 0, `expected no slots to be exposed for the unpublished week, got ${JSON.stringify(publicSlots)}`);

  const publicWeeksRes = await fetch(`${API_URL}/api/public/timetables/${published.publicToken}/weeks`);
  const publicWeeks = await publicWeeksRes.json();
  assert(
    publicWeeks.some((w) => w.id === weeks[1].id),
    `expected the incomplete/unpublished week ${weeks[1].weekNumber} to still be listed on the public site`
  );
});
