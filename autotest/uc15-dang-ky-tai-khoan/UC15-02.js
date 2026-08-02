// UC15-02 — Khởi tạo danh sách môn học mặc định [Normal]
// Steps: đăng ký -> đăng nhập -> gọi API /api/subjects -> Expect: đủ 14 môn
// học mặc định (DefaultSubjectSeeder) cho tài khoản mới.
const { run, assert, registerTestUser, API_URL, BASE_URL } = require("../_shared/helpers");

const EXPECTED_SUBJECT_COUNT = 14;

run(async (page) => {
  const { username, password } = await registerTestUser("uc15_02");

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/timetable**", { timeout: 8000 }).catch(() => {});

  const res = await page.request.get(`${API_URL}/api/subjects`);
  assert(res.ok(), `expected /api/subjects to succeed, got HTTP ${res.status()}`);
  const subjects = await res.json();
  assert(
    subjects.length === EXPECTED_SUBJECT_COUNT,
    `expected ${EXPECTED_SUBJECT_COUNT} default subjects, got ${subjects.length}`
  );
});
