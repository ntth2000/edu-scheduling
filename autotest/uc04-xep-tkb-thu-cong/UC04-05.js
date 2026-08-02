// UC04-05 — Phát hiện xung đột do thay đổi phân công [Abnormal]
// Steps: chuẩn bị tiết đã xếp -> thay đổi phân công khiến giáo viên của
// tiết đó trùng lịch với lớp khác -> mở lại tuần có xung đột -> Expect: hệ
// thống làm nổi bật các ô xung đột và thông báo rõ giáo viên, lớp và thời
// điểm xảy ra xung đột.
//
// Note: `POST /api/slots` itself refuses to create a slot that would double-
// book a teacher (SlotService throws "Giáo viên đang dạy lớp khác vào tiết
// này", 500) — so two already-conflicting slots can't be seeded directly.
// The real path to this state matches the checklist exactly: place two
// slots for two DIFFERENT teachers first (no conflict at creation time),
// then change one class's assignment to the other class's teacher
// (`POST /api/assignments` again — this only updates the assignment row,
// it never re-checks already-placed slots). Since `Slot` references
// `Assignment` (not a teacher column directly), both already-placed slots
// now resolve to the same teacher purely on read, exactly what
// `computeConflicts` (client-side, lib/timetable-data.ts) is meant to catch
// when the week is reopened.
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

function cellLocator(container, day, period) {
  const dayIndex = [2, 3, 4, 5, 6].indexOf(day);
  const rows = container.locator('[style*="grid-template-columns"]');
  return rows.nth(period).locator("> div").nth(dayIndex + 1);
}

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc04_05");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán");
  const tiengViet = subjects.find((s) => s.name === "Tiếng Việt");
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0405 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const otherTeacher = await apiPost(
    "/api/teachers",
    { fullName: `GV Khac UC0405 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const classA = await apiPost(
    "/api/classes",
    { name: `1E${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const classB = await apiPost(
    "/api/classes",
    { name: `1F${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  // Step 1: prepare two already-scheduled slots for two DIFFERENT teachers — no conflict yet.
  const assignmentA = await apiPost("/api/assignments", { classId: classA.id, subjectId: toan.id, teacherId: otherTeacher.id }, cookie);
  const assignmentB = await apiPost("/api/assignments", { classId: classB.id, subjectId: tiengViet.id, teacherId: teacher.id }, cookie);

  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  await apiPost("/api/slots", { weekId: week1.id, assignmentId: assignmentA.id, day: 2, session: 1, period: 1 }, cookie);
  await apiPost("/api/slots", { weekId: week1.id, assignmentId: assignmentB.id, day: 2, session: 1, period: 1 }, cookie);

  // Step 2: change class A's assignment to the SAME teacher as class B — this
  // creates the conflict retroactively, without touching the slots table.
  await apiPost("/api/assignments", { classId: classA.id, subjectId: toan.id, teacherId: teacher.id }, cookie);

  // Step 3: reopen the week and confirm the conflict is surfaced.
  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.locator("select").nth(1).selectOption({ label: `Lớp ${classA.name}` });

  const cell = cellLocator(page, 2, 1);
  const cellText = await cell.textContent();
  assert(cellText.includes(toan.name) && cellText.includes("Trùng lịch"), `expected class A's cell to be highlighted as conflicting, got "${cellText}"`);

  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();
  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();

  const panelToggle = page.locator("button", { hasText: "lỗi" });
  await panelToggle.waitFor({ timeout: 3000 });
  await panelToggle.click();
  const panelText = await page.locator("body").innerText();
  assert(panelText.includes(teacher.fullName), `expected the conflict panel to mention the teacher "${teacher.fullName}"`);
  assert(panelText.includes(classA.name) && panelText.includes(classB.name), `expected the conflict panel to mention both class names "${classA.name}" and "${classB.name}"`);
  assert(/Thứ 2/.test(panelText) && /Sáng/.test(panelText), "expected the conflict panel to mention the day/period");
});
