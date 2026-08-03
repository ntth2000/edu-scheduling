// UC06-08 — UID không hợp lệ [Abnormal]
// Steps: đăng xuất hoặc mở trình duyệt ẩn danh -> truy cập URL chứa UID sai
// định dạng hoặc không tồn tại.
//
// Note: the checklist's original Expect column ("chuyển người dùng về màn
// hình đăng nhập") describes the report's pre-implementation draft. The
// implemented + approved behavior (see CHECKLIST_KHOP_CODE_REPORT.md mục 1)
// is to show a friendly "not found" page and NOT redirect to /login, so the
// checklist row's wording was updated to match when this test was added —
// asserting the actual, decided behavior here.
const { run, assert, BASE_URL } = require("../_shared/helpers");

run(async (page) => {
  const fakeToken = `not-a-real-token-${Date.now()}`;

  await page.goto(`${BASE_URL}/public/timetable/${fakeToken}`, { waitUntil: "networkidle" });

  assert(
    page.url().includes(`/public/timetable/${fakeToken}`) && !page.url().includes("/login"),
    `expected to stay on the public page, not be redirected to /login — got ${page.url()}`
  );
  await page.getByText("Không tìm thấy thời khoá biểu công khai", { exact: true }).waitFor({ timeout: 5000 });
});
