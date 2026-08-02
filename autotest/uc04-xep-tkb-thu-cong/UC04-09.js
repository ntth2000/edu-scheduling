// UC04-09 — Hết phòng chức năng [Abnormal]
// Steps: xếp đủ số lớp sử dụng một loại phòng tại cùng thời điểm bằng số
// lượng phòng hiện có -> thử xếp thêm môn cần loại phòng đó vào lớp khác
// tại cùng thời điểm -> Expect: hệ thống thông báo xung đột phòng và không
// cho phép xếp môn vào ô đã chọn.
//
// Two different teachers are used for the two classes on purpose, so only
// the room-capacity check (which runs first in handleAddSlot) can be what
// blocks the add — a teacher-conflict wouldn't be a meaningful test of the
// room check specifically.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

function cellLocator(overlay, day, period) {
  const dayIndex = [2, 3, 4, 5, 6].indexOf(day);
  const rows = overlay.locator('[style*="grid-template-columns"]');
  return rows.nth(period).locator("> div").nth(dayIndex + 1);
}

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc04_09");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const miThuat = subjects.find((s) => s.name === "Mĩ thuật"); // periodsGrade1 = 1, needs a room
  const room = await apiPost("/api/special-rooms", { name: `Phòng UC0409 ${suffix}`, quantity: 1, subjectId: miThuat.id }, cookie);

  const teacherA = await apiPost("/api/teachers", { fullName: `GV A UC0409 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] }, cookie);
  const teacherB = await apiPost("/api/teachers", { fullName: `GV B UC0409 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] }, cookie);
  const classA = await apiPost("/api/classes", { name: `1K${suffix % 1000000}`, grade: 1, schoolYearId: year.id }, cookie);
  const classB = await apiPost("/api/classes", { name: `1L${suffix % 1000000}`, grade: 1, schoolYearId: year.id }, cookie);
  const assignmentA = await apiPost("/api/assignments", { classId: classA.id, subjectId: miThuat.id, teacherId: teacherA.id }, cookie);
  await apiPost("/api/assignments", { classId: classB.id, subjectId: miThuat.id, teacherId: teacherB.id }, cookie);

  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  // Room quantity is 1, and class A already occupies it at Thứ 2, Tiết 1.
  await apiPost("/api/slots", { weekId: week1.id, assignmentId: assignmentA.id, day: 2, session: 1, period: 1 }, cookie);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();

  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${classB.name}` });

  const cell = cellLocator(overlay, 2, 1);
  await cell.click();
  const popover = page.locator('[data-slot="popover-content"]').last();
  await popover.waitFor();
  await popover.getByRole("button", { name: new RegExp(`^${miThuat.name}`) }).click();

  await page.getByText(new RegExp(`^Phòng ${room.name} \\(${miThuat.name}\\) đã có`)).waitFor({ timeout: 3000 });

  // No confirmation dialog for this path — it's a hard block.
  assert(await page.getByRole("dialog", { name: "Phát hiện trùng lịch" }).count() === 0, "expected no conflict-confirmation dialog for a room block");
  const cellText = (await cell.textContent()).trim();
  assert(cellText === "", `expected class B's cell to remain empty, got "${cellText}"`);

  const slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(!slots.some((s) => s.classId === classB.id), "expected no slot to have been created for class B");
});
