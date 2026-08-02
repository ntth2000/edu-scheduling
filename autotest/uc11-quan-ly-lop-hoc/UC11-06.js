// UC11-06 — Khối không hợp lệ [Abnormal]
// Steps: chọn thêm hoặc sửa lớp -> nhập/chọn khối ngoài phạm vi hợp lệ ->
// xác nhận lưu -> Expect: hệ thống thông báo khối không hợp lệ và không lưu.
//
// Note: the UI never lets you literally "enter" an invalid grade — both the
// Add form (5 fixed grade buttons) and the Edit form (a Select with exactly
// options Khối 1..5) are closed sets, so step 2 can't be reproduced by
// clicking. This test documents that UI-level restriction directly, and
// separately confirms the API rejects an out-of-range grade
// (ClassRequest.grade is @Min(1) @Max(5)) as the defense-in-depth backing it.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiPost,
  cookieHeaderFrom,
  BASE_URL,
  API_URL,
} = require("../_shared/helpers");

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc11_06");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);
  const suffix = Date.now();

  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `1F${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );

  // API-level: out-of-range grade must be rejected, nothing persisted.
  const res = await fetch(`${API_URL}/api/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: `6G${suffix % 1000000}`, grade: 6, schoolYearId: year.id }),
  });
  assert(res.status === 400, `expected HTTP 400 for grade=6, got ${res.status}`);

  const res0 = await fetch(`${API_URL}/api/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: `0G${suffix % 1000000}`, grade: 0, schoolYearId: year.id }),
  });
  assert(res0.status === 400, `expected HTTP 400 for grade=0, got ${res0.status}`);

  // UI-level: confirm there is genuinely no way to pick an invalid grade.
  await page.goto(`${BASE_URL}/classes?year=${encodeURIComponent(year.name)}`, { waitUntil: "networkidle" });
  const row = page.locator("div.group", { hasText: `Lớp ${schoolClass.name}` });
  await row.locator("button").nth(0).click(); // pencil = edit

  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog.getByRole("combobox").first().click(); // Khối select
  const options = page.getByRole("option");
  const optionTexts = await options.allTextContents();
  assert(
    optionTexts.length === 5 && optionTexts.every((t) => /^Khối [1-5]$/.test(t.trim())),
    `expected exactly the 5 valid grade options, got ${JSON.stringify(optionTexts)}`
  );
});
