// UC03-02 — Phân công theo giáo viên không làm GVCN [Normal]
// Steps: mở tab Phân công Chuyên môn và chọn chế độ xem theo giáo viên ->
// tại một giáo viên không làm GVCN, chọn nút "Chỉnh sửa" -> xác nhận modal
// hiển thị tiêu đề "Phân công chuyên môn chi tiết cho giáo viên [Tên giáo
// viên]" -> kiểm tra trạng thái checkbox của các lớp/môn -> chọn checkbox
// của một lớp/môn có định mức lớn hơn 0 -> chọn Lưu và kiểm tra cột "Môn
// dạy" -> Expect: modal hiển thị đúng tên giáo viên. Checkbox của tất cả
// lớp đối với các môn có định mức lớn hơn 0 được enable; checkbox của môn
// có định mức bằng 0 bị disable. Sau khi lưu, phân công được tạo và cột
// "Môn dạy" hiển thị đúng lớp/môn vừa chọn.
//
// Note: the row's edit button (SubjectAssignment.tsx) is an icon-only
// <Button> with no aria-label/text — there is no "Chỉnh sửa" accessible
// name anywhere in the DOM, so it's located structurally (first button in
// the teacher's row) instead of by name.
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
  const { username, password } = await registerTestUser("uc03_02");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán"); // periodsGrade1 = 3 (> 0)
  const ngoaiNgu = subjects.find((s) => s.name === "Ngoại ngữ 1"); // periodsGrade1 = 0
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1B${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0302 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: "Theo giáo viên" }).click();

  const teacherRow = page.locator("tbody tr", { hasText: teacher.fullName });
  await teacherRow.locator("button").first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert(
    await dialog.getByText(`Phân công chuyên môn chi tiết cho giáo viên ${teacher.fullName}`, { exact: true }).count() === 1,
    "expected the modal title to include the teacher's full name"
  );

  const headerTexts = (await dialog.locator("thead th").allTextContents()).map((t) => t.trim());
  const toanCell = dialog
    .locator("tbody tr", { hasText: schoolClass.name })
    .locator("td")
    .nth(headerTexts.indexOf(toan.name));
  const ngoaiNguCell = dialog
    .locator("tbody tr", { hasText: schoolClass.name })
    .locator("td")
    .nth(headerTexts.indexOf(ngoaiNgu.name));

  assert(await toanCell.getByRole("checkbox").isEnabled(), `expected "${toan.name}" (3 tiết) checkbox to be enabled`);
  assert(await ngoaiNguCell.getByRole("checkbox").isDisabled(), `expected "${ngoaiNgu.name}" (0 tiết) checkbox to be disabled`);

  await toanCell.getByRole("checkbox").click();
  await dialog.getByRole("button", { name: "Lưu phân công", exact: true }).click();

  await page.getByText("Đã lưu 1 phân công", { exact: true }).waitFor({ timeout: 3000 });
  await dialog.waitFor({ state: "hidden", timeout: 3000 });

  const summaryCell = page.locator("tbody tr", { hasText: teacher.fullName }).locator("td").last();
  const summaryText = await summaryCell.textContent();
  assert(
    summaryText.includes(schoolClass.name) && summaryText.includes(toan.name),
    `expected "Môn dạy" column to show "${schoolClass.name}" / "${toan.name}", got "${summaryText}"`
  );

  const assignments = await apiGet(`/api/assignments?teacherId=${teacher.id}`, cookie);
  const saved = assignments.find((a) => a.classId === schoolClass.id && a.subjectId === toan.id);
  assert(saved, `expected an assignment for "${toan.name}" in class "${schoolClass.name}" for this teacher`);
});
