// UC13-02 — Tuần chưa xếp xong bị vô hiệu hoá [Abnormal]
// Steps: chuẩn bị ít nhất một tuần chưa xếp xong -> mở popup công bố -> thử
// chọn checkbox của tuần chưa hoàn thành -> Expect: checkbox của tuần chưa
// xếp xong ở trạng thái disable và người dùng không thể chọn tuần đó để
// công bố.
const { run, assert, registerTestUser, loginUI, cookieHeaderFrom, BASE_URL } = require("../_shared/helpers");
const { seedMinimalSchoolYear, weekCheckbox, weekLabel, openPublishDialog } = require("./_fixtures");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc13_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const { year, semester1, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  // No week is scheduled at all -> every week is "chưa xếp xong".

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const dialog = await openPublishDialog(page);

  const box = weekCheckbox(dialog, weeks[0].weekNumber);
  assert(await box.isDisabled(), `expected week ${weeks[0].weekNumber}'s checkbox to be disabled (not fully scheduled)`);

  await box.click({ force: true }).catch(() => {});
  assert(!(await box.isChecked()), "expected the disabled checkbox to remain unchecked after attempting to click it");

  await weekLabel(dialog, weeks[0].weekNumber).hover();
  const tooltip = page.locator('[data-slot="tooltip-content"]');
  await tooltip.waitFor({ timeout: 3000 });
  const reasonText = await tooltip.textContent();
  assert(/chưa xếp|tiết chưa xếp/.test(reasonText), `expected a tooltip explaining the week isn't fully scheduled, got "${reasonText}"`);
});
