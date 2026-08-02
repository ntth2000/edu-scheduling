// UC09-01 — Xem và tìm kiếm giáo viên [Normal]
// Steps: mở Quản lý giáo viên, kiểm tra cột và tìm theo tên -> Expect:
// chỉ hiện giáo viên khớp; không còn loại GV, môn dạy, trạng thái hay bộ lọc
// tương ứng.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc09_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();
  const matchingName = `Nguyễn Minh UC0901 ${suffix}`;
  const otherName = `Trần Lan Đối Chứng ${suffix}`;

  await apiPost(
    "/api/teachers",
    { fullName: matchingName, type: "BO_MON", maxPeriodsPerWeek: 18, subjectIds: [] },
    cookie
  );
  await apiPost(
    "/api/teachers",
    { fullName: otherName, type: "CHU_NHIEM", maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );

  await page.goto(`${BASE_URL}/teachers`, { waitUntil: "networkidle" });

  const headerText = await page.locator("table thead").textContent();
  for (const expectedHeader of ["Mã GV", "Họ tên", "Định mức tiết/tuần", "Thao tác"]) {
    assert(headerText.includes(expectedHeader), `expected table header "${expectedHeader}"`);
  }
  for (const removedHeader of ["Loại giáo viên", "Loại GV", "Môn dạy", "Trạng thái", "Active", "Deactive"]) {
    assert(!headerText.includes(removedHeader), `unexpected removed table column "${removedHeader}"`);
  }

  const searchInput = page
    .locator(
      'input[type="search"], input[placeholder*="Tìm kiếm" i], input[placeholder*="tìm giáo viên" i], input[placeholder*="tên giáo viên" i]'
    )
    .first();
  assert(await searchInput.count() > 0, "expected a teacher-name search input");

  await searchInput.fill("Minh UC0901");
  await page.waitForTimeout(300);
  assert(
    await page.locator("table tbody tr", { hasText: matchingName }).count() === 1,
    `expected search result for "${matchingName}"`
  );
  assert(
    await page.locator("table tbody tr", { hasText: otherName }).count() === 0,
    `expected non-matching teacher "${otherName}" to be hidden`
  );

  const filterButton = page.getByRole("button", { name: /Lọc/i }).first();
  if (await filterButton.count() > 0) {
    await filterButton.click();
    const filterDialog = page.getByRole("dialog");
    await filterDialog.waitFor();
    const filterText = await filterDialog.textContent();
    for (const removedFilter of ["Loại giáo viên", "Loại GV", "Môn dạy", "Trạng thái", "Active", "Deactive"]) {
      assert(!filterText.includes(removedFilter), `unexpected removed teacher filter "${removedFilter}"`);
    }
  }
});
