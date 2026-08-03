// UC06-04 — Tra cứu tuần đã công bố theo giáo viên [Normal]
// Steps: mở URL công khai hợp lệ -> chọn một tuần đã công bố -> chọn chế độ
// xem theo giáo viên -> chọn giáo viên -> Expect: hệ thống hiển thị đúng
// các tiết đã công bố của giáo viên trong tuần được chọn.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_04");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, teacher, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Theo GV" }).click();
  // Single teacher in the fixture, already auto-selected — verify anyway.
  await page.locator("select").first().selectOption({ label: teacher.fullName });

  const gridText = (await page.locator('[style*="grid-template-columns"]').allTextContents()).join(" ");
  assert(
    gridText.includes(subject.name) && gridText.includes(schoolClass.name),
    `expected the teacher grid to show "${subject.name}" for class "${schoolClass.name}", got "${gridText}"`
  );
});
