// UC03-07 — Phân công chuyên môn cho GVCN và huỷ thay đổi [Abnormal]
// Steps: chuẩn bị giáo viên Hoa đang là GVCN của một lớp -> mở chế độ xem
// theo giáo viên và chọn "Chỉnh sửa" tại giáo viên Hoa -> xác nhận tiêu đề
// modal nêu rõ Hoa đang chủ nhiệm lớp nào -> kiểm tra trạng thái checkbox
// của các lớp/môn -> chọn một checkbox ở lớp Hoa KHÔNG chủ nhiệm -> chọn Huỷ
// và kiểm tra cột "Môn dạy" -> Expect: GVCN vẫn được phân công dạy ở lớp
// khác (checkbox enable), chỉ môn có định mức bằng 0 mới bị disable; tiêu đề
// hiển thị "(Chủ nhiệm lớp X)" với GVCN và không có phần trong ngoặc với
// giáo viên không chủ nhiệm lớp nào. Sau khi chọn checkbox rồi Huỷ, phân
// công không được lưu và cột "Môn dạy" không xuất hiện lớp/môn vừa chọn.
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
  const { username, password } = await registerTestUser("uc03_07");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const toan = subjects.find((s) => s.name === "Toán"); // periodsGrade1 = 3 (> 0)
  const ngoaiNgu = subjects.find((s) => s.name === "Ngoại ngữ 1"); // periodsGrade1 = 0
  const hoa = await apiPost(
    "/api/teachers",
    { fullName: `Hoa ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  // Giáo viên thứ hai không chủ nhiệm lớp nào, dùng để đối chiếu tiêu đề modal.
  const binh = await apiPost(
    "/api/teachers",
    { fullName: `Binh ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const herClass = await apiPost(
    "/api/classes",
    { name: `1G${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const otherClass = await apiPost(
    "/api/classes",
    { name: `1H${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  await apiPost("/api/assignments/homeroom", { classId: herClass.id, teacherId: hoa.id }, cookie);

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chuyên môn" }).click();
  await page.getByRole("button", { name: "Theo giáo viên" }).click();

  const hoaRow = page.locator("tbody tr", { hasText: hoa.fullName });
  await hoaRow.locator("button").first().click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();

  // GVCN -> tiêu đề nêu rõ lớp đang chủ nhiệm.
  const expectedTitle =
    `Phân công chuyên môn chi tiết cho giáo viên ${hoa.fullName} (Chủ nhiệm lớp ${herClass.name})`;
  assert(
    await dialog.getByText(expectedTitle, { exact: true }).count() === 1,
    `expected the modal title to be "${expectedTitle}"`
  );

  const headerTexts = (await dialog.locator("thead th").allTextContents()).map((t) => t.trim());
  const toanIdx = headerTexts.indexOf(toan.name);
  const ngoaiNguIdx = headerTexts.indexOf(ngoaiNgu.name);

  const herClassRow = dialog.locator("tbody tr", { hasText: herClass.name });
  const otherClassRow = dialog.locator("tbody tr", { hasText: otherClass.name });

  const herToanCheckbox = herClassRow.locator("td").nth(toanIdx).getByRole("checkbox");
  const herNgoaiNguCheckbox = herClassRow.locator("td").nth(ngoaiNguIdx).getByRole("checkbox");
  const otherToanCheckbox = otherClassRow.locator("td").nth(toanIdx).getByRole("checkbox");

  assert(await herToanCheckbox.isEnabled(), `expected "${toan.name}" for her own homeroom class to be enabled`);
  assert(
    await herNgoaiNguCheckbox.isDisabled(),
    `expected "${ngoaiNgu.name}" (0 tiết) to stay disabled — chỉ định mức 0 mới khoá ô`
  );
  assert(
    await otherToanCheckbox.isEnabled(),
    `expected "${toan.name}" for a class she doesn't head to be ENABLED — GVCN vẫn dạy được lớp khác`
  );

  // Tick ở lớp KHÔNG phải lớp chủ nhiệm rồi huỷ -> không được lưu gì.
  await otherToanCheckbox.click();
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await dialog.waitFor({ state: "hidden", timeout: 3000 });

  const summaryCell = page.locator("tbody tr", { hasText: hoa.fullName }).locator("td").last();
  const summaryText = await summaryCell.textContent();
  assert(
    !summaryText.includes(toan.name) && !summaryText.includes(otherClass.name),
    `expected "Môn dạy" to NOT show "${otherClass.name}" / "${toan.name}" after cancelling, got "${summaryText}"`
  );

  const assignments = await apiGet(`/api/assignments?teacherId=${hoa.id}`, cookie);
  assert(assignments.length === 0, `expected no assignment to be created after cancelling, got ${assignments.length}`);

  // Giáo viên không chủ nhiệm lớp nào -> tiêu đề không có phần trong ngoặc.
  const binhRow = page.locator("tbody tr", { hasText: binh.fullName });
  await binhRow.locator("button").first().click();
  const binhDialog = page.getByRole("dialog");
  await binhDialog.waitFor();
  const binhTitle = `Phân công chuyên môn chi tiết cho giáo viên ${binh.fullName}`;
  assert(
    await binhDialog.getByText(binhTitle, { exact: true }).count() === 1,
    `expected the modal title for a non-homeroom teacher to be exactly "${binhTitle}" (no parenthetical)`
  );
});
