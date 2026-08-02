// UC04-08 — Trùng lịch giáo viên [Abnormal]
// Steps: chọn ô có cùng thời điểm với tiết giáo viên đang dạy lớp khác ->
// chọn môn do giáo viên đó phụ trách -> Expect: hệ thống thông báo xung đột
// giáo viên và cho phép người dùng lựa chọn loại bỏ tiết xung đột ở lớp
// khác trước khi lưu tiết mới.
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
  const { username, password } = await registerTestUser("uc04_08");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán");
  const tiengViet = subjects.find((s) => s.name === "Tiếng Việt");
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0408 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const classA = await apiPost(
    "/api/classes",
    { name: `1I${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const classB = await apiPost(
    "/api/classes",
    { name: `1J${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const assignmentA = await apiPost("/api/assignments", { classId: classA.id, subjectId: toan.id, teacherId: teacher.id }, cookie);
  const assignmentB = await apiPost("/api/assignments", { classId: classB.id, subjectId: tiengViet.id, teacherId: teacher.id }, cookie);

  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  // Class B already has the teacher busy at Thứ 2, Tiết 1.
  await apiPost("/api/slots", { weekId: week1.id, assignmentId: assignmentB.id, day: 2, session: 1, period: 1 }, cookie);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();

  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${classA.name}` });

  const cell = cellLocator(overlay, 2, 1); // same slot the teacher is already busy at
  await cell.click();
  const popover = page.locator('[data-slot="popover-content"]').last();
  await popover.waitFor();
  await popover.getByRole("button", { name: new RegExp(`^${toan.name}`) }).click();

  const conflictDialog = page.getByRole("dialog", { name: "Phát hiện trùng lịch" });
  await conflictDialog.waitFor({ timeout: 3000 });
  const dialogText = await conflictDialog.textContent();
  assert(dialogText.includes(tiengViet.name) && dialogText.includes(classB.name), `expected the conflict dialog to name the existing slot ("${tiengViet.name}" / "${classB.name}"), got "${dialogText}"`);
  assert(dialogText.includes(toan.name) && dialogText.includes(classA.name), `expected the conflict dialog to name the new slot ("${toan.name}" / "${classA.name}"), got "${dialogText}"`);

  await conflictDialog.getByRole("button", { name: "Tiếp tục", exact: true }).click();

  const cellText = await cell.textContent();
  assert(cellText.includes(toan.name) && cellText.includes("Chưa lưu"), `expected class A's cell to now hold the pending "${toan.name}", got "${cellText}"`);

  await overlay.getByRole("button", { name: /^Lưu tuần/ }).click();
  await page.getByText("Đã lưu 2 thay đổi", { exact: true }).waitFor({ timeout: 3000 });

  const slots = await apiGet(`/api/slots?weekId=${week1.id}`, cookie);
  assert(
    !slots.some((s) => s.classId === classB.id && s.day === 2 && s.period === 1),
    "expected class B's conflicting slot to have been removed"
  );
  const newSlot = slots.find((s) => s.classId === classA.id && s.day === 2 && s.period === 1);
  assert(newSlot && newSlot.subjectId === toan.id && newSlot.teacherId === teacher.id, "expected class A to now hold the new slot with the shared teacher");
});
