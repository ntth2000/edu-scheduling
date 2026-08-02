// UC08-01 — Xem danh sách môn học [Normal]
// Steps: truy cập Quản lý môn học -> Expect: hiển thị danh sách môn học và số
// tiết mỗi tuần theo từng khối.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  cookieHeaderFrom,
  BASE_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc08_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);

  const subjects = await apiGet("/api/subjects", cookie);
  assert(subjects.length > 0, "expected default subjects to be seeded for a new user");
  const target = subjects[0];

  await page.goto(`${BASE_URL}/subjects`, { waitUntil: "networkidle" });

  const headerText = await page.locator("table thead").textContent();
  for (const expected of ["Tên môn học", "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5"]) {
    assert(headerText.includes(expected), `expected table header "${expected}"`);
  }

  const row = page.locator("table tbody tr", { hasText: target.name });
  assert(await row.count() === 1, `expected a row for subject "${target.name}"`);

  const periods = [
    target.periodsGrade1,
    target.periodsGrade2,
    target.periodsGrade3,
    target.periodsGrade4,
    target.periodsGrade5,
  ];
  const cells = row.locator("td");
  for (let i = 0; i < periods.length; i++) {
    const text = (await cells.nth(2 + i).textContent()).trim();
    assert(
      text === String(periods[i]),
      `expected grade ${i + 1} period ${periods[i]} for "${target.name}", got "${text}"`
    );
  }
});
