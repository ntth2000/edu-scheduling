// UC04-06 — Môn chưa được phân công giáo viên [Abnormal]
// Steps: chọn lớp có môn chưa được phân công giáo viên -> mở danh sách môn
// tại một ô trống -> thử chọn môn đó -> Expect: hệ thống hiển thị trạng
// thái/thông báo chưa được phân công và không cho phép chọn môn.
//
// Note: the option itself isn't DOM-disabled for this case (only the
// "already fully scheduled" case is, see UC04-07) — CellPopover.handleSelect
// intercepts the click and rejects it with a toast instead, and the picker
// stays open. So "không cho phép chọn môn" here means "the click is
// rejected", not "the button is inert".
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
  const { username, password } = await registerTestUser("uc04_06");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const subjects = await apiGet("/api/subjects", cookie);
  const tiengViet = subjects.find((s) => s.name === "Tiếng Việt"); // periodsGrade1 = 12, left unassigned
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1G${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  // No assignment created for Tiếng Việt on purpose.

  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);

  await page.goto(`${BASE_URL}/timetable/${semester1.id}?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cập nhật thời khoá biểu" }).click();

  const overlay = page.locator("div.fixed.inset-0.z-9999");
  await overlay.waitFor();
  await overlay.locator("select").nth(1).selectOption({ label: `Lớp ${schoolClass.name}` });

  const cell = cellLocator(overlay, 2, 1);
  await cell.click();

  const popover = page.locator('[data-slot="popover-content"]').last();
  await popover.waitFor();
  const option = popover.getByRole("button", { name: new RegExp(`^${tiengViet.name}`) });
  const optionText = await option.textContent();
  assert(optionText.includes("Chưa phân công"), `expected the option to show "Chưa phân công", got "${optionText}"`);
  assert(await option.isEnabled(), "expected the option to be clickable (rejection happens on click, not via disabled)");

  await option.click();
  await page.getByText(
    `Môn học ${tiengViet.name} của lớp ${schoolClass.name} chưa được phân công giáo viên dạy. Hãy phân công trước khi xếp TKB.`,
    { exact: true }
  ).waitFor({ timeout: 3000 });

  assert(await popover.isVisible(), "expected the picker to remain open after a rejected selection");
  const cellText = (await cell.textContent()).trim();
  assert(cellText === "", `expected the cell to remain empty, got "${cellText}"`);
});
