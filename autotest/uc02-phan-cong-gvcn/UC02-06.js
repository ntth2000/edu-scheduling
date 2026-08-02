// UC02-06 — Giáo viên đã chủ nhiệm lớp khác [Abnormal]
// Steps: xác định giáo viên đang là GVCN của một lớp trong năm học -> mở
// danh sách chọn GVCN của lớp khác -> Expect: giáo viên đó không xuất hiện
// trong danh sách có thể chọn hoặc hệ thống từ chối lưu và thông báo
// nguyên nhân.
//
// Covers both halves of the (OR) expectation:
//  - UI: the teacher never shows up as a selectable option for another
//    class (HomeroomAssignment.availableTeachers filter) — this is the path
//    a real user hits.
//  - Backend, as defense-in-depth if the endpoint is ever called directly
//    (bypassing the UI filter): AssignmentService.assignHomeroom throws a
//    plain RuntimeException, which — since there's no @ControllerAdvice in
//    this codebase — surfaces as HTTP 500 rather than a 4xx, though the
//    reason is still present in the JSON body's `message`
//    (spring.web.error.include-message=always). Documented here rather than
//    fixed; a 409 Conflict via ResponseStatusException would be more correct.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
  API_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc02_06");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV UC0206 ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [] },
    cookie
  );
  const classA = await apiPost(
    "/api/classes",
    { name: `4A${suffix % 1000000}`, grade: 4, schoolYearId: year.id },
    cookie
  );
  const classB = await apiPost(
    "/api/classes",
    { name: `4B${suffix % 1000000}`, grade: 4, schoolYearId: year.id },
    cookie
  );
  await apiPost("/api/assignments/homeroom", { classId: classA.id, teacherId: teacher.id }, cookie);

  await page.goto(`${BASE_URL}/assignments?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Phân công Chủ nhiệm" }).click();

  const rowB = page.getByText(classB.name, { exact: true }).locator("xpath=..");
  await rowB.getByRole("combobox").click();
  const optionTexts = (await page.getByRole("option").allTextContents()).map((t) => t.trim());
  assert(
    !optionTexts.includes(teacher.fullName),
    `expected "${teacher.fullName}" (already GVCN of "${classA.name}") to NOT be selectable for "${classB.name}", got ${JSON.stringify(optionTexts)}`
  );
  await page.keyboard.press("Escape");

  // Defense-in-depth: bypass the UI and hit the endpoint directly.
  const res = await fetch(`${API_URL}/api/assignments/homeroom`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ classId: classB.id, teacherId: teacher.id }),
  });
  assert(!res.ok, `expected a non-2xx response when assigning an already-homeroom teacher, got HTTP ${res.status}`);
  const body = await res.json().catch(() => ({}));
  assert(
    typeof body.message === "string" && /đã là GVCN/.test(body.message),
    `expected the response body to explain the rejection reason, got ${JSON.stringify(body)}`
  );

  const classBAfter = await apiGet(`/api/classes/${classB.id}`, cookie);
  assert(classBAfter.homeroomTeacherId === null, "expected class B to still have no GVCN after the rejected assignment");
});
