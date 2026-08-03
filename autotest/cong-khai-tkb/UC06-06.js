// UC06-06 — Chọn tuần chưa được công bố [Abnormal]
// Steps: mở URL công khai hợp lệ của học kỳ có cả tuần đã và chưa công bố
// -> mở danh sách tuần -> chọn một tuần chưa được công bố -> Expect: tuần
// chưa công bố vẫn xuất hiện trong danh sách nhưng lưới TKB để trống; hệ
// thống không tiết lộ bất kỳ tiết học chưa công bố nào.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_06");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  // weeks[1] is intentionally left empty (never scheduled) and unpublished.
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  const weekSelect = page.locator("select").last();
  const optionTexts = (await weekSelect.locator("option").allTextContents()).map((t) => t.trim());
  assert(
    optionTexts.some((t) => t === `Tuần ${weeks[1].weekNumber}`),
    `expected the unpublished week ${weeks[1].weekNumber} to still be listed, got ${JSON.stringify(optionTexts)}`
  );

  await weekSelect.selectOption({ label: `Tuần ${weeks[1].weekNumber}` });
  await page.waitForTimeout(300);

  const bodyText = await page.locator("body").textContent();
  assert(!bodyText.includes(subject.name), `expected no trace of "${subject.name}" while viewing the unpublished week, but it was present on the page`);
});
