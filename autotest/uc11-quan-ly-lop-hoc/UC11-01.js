// UC11-01 — Xem lớp theo năm học [Normal]
// Steps: chọn một năm học -> truy cập Lớp học -> Expect: hệ thống chỉ hiển
// thị danh sách lớp thuộc năm học đã chọn.
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
  const { username, password } = await registerTestUser("uc11_01");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const yearA = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 90) }, cookie);
  const yearB = await apiPost("/api/school-years", { startYear: 2091 + (suffix % 9) }, cookie);

  const classA = await apiPost(
    "/api/classes",
    { name: `A${suffix % 1000000}`, grade: 1, schoolYearId: yearA.id },
    cookie
  );
  const classB = await apiPost(
    "/api/classes",
    { name: `B${suffix % 1000000}`, grade: 1, schoolYearId: yearB.id },
    cookie
  );

  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(yearA.name)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  assert(
    await page.getByText(`Lớp ${classA.name}`, { exact: true }).count() === 1,
    `expected class "${classA.name}" (year ${yearA.name}) to be visible`
  );
  assert(
    await page.getByText(`Lớp ${classB.name}`, { exact: true }).count() === 0,
    `expected class "${classB.name}" (year ${yearB.name}) to NOT be visible while viewing ${yearA.name}`
  );
});
