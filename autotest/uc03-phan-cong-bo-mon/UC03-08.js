// UC03-08 — Tên lớp chủ nhiệm không bị trùng lặp giữa các năm học [Abnormal]
// Steps: tạo hai năm học -> tạo giáo viên Tuyền -> ở mỗi năm học tạo một lớp
// CÙNG TÊN "1B" (tên lớp chỉ duy nhất trong phạm vi một năm học) -> phân công
// Tuyền làm GVCN của cả hai lớp -> mở Phân công Chuyên môn ở năm học thứ hai,
// chọn Chỉnh sửa tại Tuyền -> Expect: tiêu đề modal ghi đúng "(Chủ nhiệm lớp
// 1B)" của riêng năm học đang xem, KHÔNG phải "(Chủ nhiệm lớp 1B, 1B)".
//
// Lỗi gốc: TeacherService.toResponse gom lớp chủ nhiệm bằng
// classRepository.findAllByHomeroomTeacherId (mọi năm học) rồi String.join,
// nên cùng một tên lớp ở hai năm học bị nối lại thành "1B, 1B".
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

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc03_08");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const startYear = 2000 + (suffix % 90);
  const year1 = await apiPost("/api/school-years", { startYear }, cookie);
  const year2 = await apiPost("/api/school-years", { startYear: startYear + 1 }, cookie);

  const tuyen = await apiPost(
    "/api/teachers",
    { fullName: `Tuyen ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );

  // Cùng tên lớp ở hai năm học — hợp lệ vì UNIQUE(name, school_year_id).
  const className = `1B${suffix % 1000000}`;
  const classYear1 = await apiPost(
    "/api/classes",
    { name: className, grade: 1, schoolYearId: year1.id },
    cookie
  );
  const classYear2 = await apiPost(
    "/api/classes",
    { name: className, grade: 1, schoolYearId: year2.id },
    cookie
  );
  await apiPost("/api/assignments/homeroom", { classId: classYear1.id, teacherId: tuyen.id }, cookie);
  await apiPost("/api/assignments/homeroom", { classId: classYear2.id, teacherId: tuyen.id }, cookie);

  // Tầng API: có lọc theo năm học thì chỉ được trả về đúng một lớp.
  const scoped = await apiGet(`/api/teachers?year=${encodeURIComponent(year2.name)}`, cookie);
  const tuyenScoped = scoped.find((t) => t.id === tuyen.id);
  assert(
    tuyenScoped.homeroomClassName === className,
    `expected homeroomClassName scoped to ${year2.name} to be "${className}", got "${tuyenScoped.homeroomClassName}"`
  );

  // Không lọc năm học (trang quản lý giáo viên): vẫn phải khử trùng tên lớp.
  const unscoped = await apiGet("/api/teachers", cookie);
  const tuyenUnscoped = unscoped.find((t) => t.id === tuyen.id);
  assert(
    tuyenUnscoped.homeroomClassName === className,
    `expected duplicate class names to collapse to "${className}", got "${tuyenUnscoped.homeroomClassName}"`
  );

  // Tầng giao diện: tiêu đề modal không được lặp tên lớp.
  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year2.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: "Theo giáo viên" }).click();

  const tuyenRow = page.locator("tbody tr", { hasText: tuyen.fullName });
  await tuyenRow.locator("button").first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const expectedTitle =
    `Phân công chuyên môn chi tiết cho giáo viên ${tuyen.fullName} (Chủ nhiệm lớp ${className})`;
  assert(
    await dialog.getByText(expectedTitle, { exact: true }).count() === 1,
    `expected the modal title to be "${expectedTitle}" (no duplicated class name)`
  );
});
