// UC06-10 — Không rò rỉ dữ liệu giữa tuần đã và chưa công bố [Abnormal]
// Steps: chuẩn bị hai tuần có dữ liệu, chỉ công bố một tuần -> mở URL công
// khai -> lần lượt chọn cả hai tuần và các chế độ xem lớp, khối, giáo viên
// -> Expect: chỉ tuần được công bố hiển thị dữ liệu; tuần chưa công bố luôn
// để trống ở mọi chế độ xem.
const { run, assert, registerTestUser, BASE_URL } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

async function selectWeek(page, weekNumber) {
  await page.locator("select").last().selectOption({ label: `Tuần ${weekNumber}` });
  await page.waitForTimeout(300);
}

run(async (page) => {
  const { username, password } = await registerTestUser("uc06_10");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  await scheduleWeekCompletely(weeks[0].id, cookie); // will be published
  await scheduleWeekCompletely(weeks[1].id, cookie); // has data, stays unpublished
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  await page.goto(`${BASE_URL}/public/timetable/${published.publicToken}`, { waitUntil: "networkidle" });

  // Chế độ theo lớp
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });
  await selectWeek(page, weeks[0].weekNumber);
  assert((await page.locator("body").textContent()).includes(subject.name), "class view: expected published week to show data");
  await selectWeek(page, weeks[1].weekNumber);
  assert(!(await page.locator("body").textContent()).includes(subject.name), "class view: expected unpublished week to stay empty");

  // Chế độ theo khối ("Cả khối")
  await page.locator("select").nth(1).selectOption({ label: "Cả khối" });
  await selectWeek(page, weeks[0].weekNumber);
  assert((await page.locator("body").textContent()).includes(subject.name), "grade view: expected published week to show data");
  await selectWeek(page, weeks[1].weekNumber);
  assert(!(await page.locator("body").textContent()).includes(subject.name), "grade view: expected unpublished week to stay empty");

  // Chế độ theo giáo viên
  await page.getByRole("button", { name: "Theo GV" }).click();
  await selectWeek(page, weeks[0].weekNumber);
  assert((await page.locator("body").textContent()).includes(subject.name), "teacher view: expected published week to show data");
  await selectWeek(page, weeks[1].weekNumber);
  assert(!(await page.locator("body").textContent()).includes(subject.name), "teacher view: expected unpublished week to stay empty");
});
