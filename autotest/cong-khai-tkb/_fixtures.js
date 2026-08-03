// Shared fixture helpers for the "Công khai thời khoá biểu" / "Tra cứu công
// khai" test suite (UC06 + UC13 in ../../MANUAL_TEST_CHECKLIST.md). Not part
// of ../_shared/ because it's specific to this usecase's data shape; each
// test file still stays independently runnable via `node <file>` since this
// is just a regular sibling require, same as `../_shared/helpers`.
const { API_URL, apiGet, apiPost } = require("../_shared/helpers");

// Logs a user in via a raw request instead of the UI, returning a `Cookie:`
// header string. Used by tests that must keep the shared Playwright `page`
// unauthenticated (e.g. "open the public link in an incognito tab") while
// still needing an authenticated cookie to seed fixture data as the
// timetable's owner.
async function loginApiOnly(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Setup failed: could not log in ${username} (HTTP ${res.status})`);
  }
  const { accessToken } = await res.json();
  return `access_token=${accessToken}`;
}

// Seeds the minimal school year needed for these tests: 1 class (khối 1), 1
// subject that needs exactly 1 period/week at grade 1, 1 teacher, and the
// assignment linking them — so a week counts as "fully scheduled" (eligible
// to publish) after placing a single slot, keeping every test's setup cheap.
async function seedMinimalSchoolYear(cookie, suffix) {
  const year = await apiPost("/api/school-years", { startYear: 2000 + (suffix % 100) }, cookie);
  const schoolClass = await apiPost(
    "/api/classes",
    { name: `CK${suffix % 1000000}`, grade: 1, schoolYearId: year.id },
    cookie
  );
  const subject = await apiPost(
    "/api/subjects",
    { name: `CK-Subj-${suffix}`, periodsGrade1: 1, periodsGrade2: 0, periodsGrade3: 0, periodsGrade4: 0, periodsGrade5: 0 },
    cookie
  );
  const teacher = await apiPost(
    "/api/teachers",
    { fullName: `GV CK ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [subject.id] },
    cookie
  );
  const assignment = await apiPost(
    "/api/assignments",
    { classId: schoolClass.id, subjectId: subject.id, teacherId: teacher.id },
    cookie
  );
  const timetables = await apiGet(`/api/timetables?schoolYearId=${year.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  const semester2 = timetables.find((t) => t.semesterOrder === 2);
  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  return { year, semester1, semester2, schoolClass, subject, teacher, assignment, weeks };
}

// Fully schedules `weekId` via the real auto-generator (POST .../generate)
// then persists the proposed slot(s) via POST /api/slots — with the minimal
// fixture above there is always exactly one assignment needing one period,
// so this always yields exactly one slot. Returns the persisted SlotResponse[].
async function scheduleWeekCompletely(weekId, cookie) {
  const result = await apiPost(`/api/weeks/${weekId}/generate`, {}, cookie);
  const created = [];
  for (const s of result.slots) {
    const session = s.period <= 4 ? 1 : 2;
    created.push(
      await apiPost(
        "/api/slots",
        { weekId, assignmentId: s.assignmentId, day: s.day, session, period: s.period },
        cookie
      )
    );
  }
  return created;
}

// Wraps POST /api/timetables/{id}/publish (expected to succeed — use a raw
// fetch instead for negative-path tests that expect 4xx).
async function publishWeeks(timetableId, weekIds, cookie) {
  return apiPost(`/api/timetables/${timetableId}/publish`, { weekIds }, cookie);
}

// Same TimetableGrid/TeacherTimetableGrid row layout used across the repo's
// other timetable tests (rows carry an inline `grid-template-columns` style;
// row 0 is the header, column 0 is the period label).
function cellLocator(scope, day, period) {
  const dayIndex = [2, 3, 4, 5, 6].indexOf(day);
  const rows = scope.locator('[style*="grid-template-columns"]');
  return rows.nth(period).locator("> div").nth(dayIndex + 1);
}

// PublishTimetableDialog renders `<label><Checkbox/>Tuần {n}</label>` with
// no accessible name wired to the checkbox beyond that wrapping — locate
// structurally (like UC03-02's table-cell checkboxes) instead of by
// accessible name, anchored so "Tuần 1" can't match "Tuần 10".
function weekLabel(dialog, weekNumber) {
  return dialog.locator("label").filter({ hasText: new RegExp(`^Tuần ${weekNumber}$`) });
}
function weekCheckbox(dialog, weekNumber) {
  return weekLabel(dialog, weekNumber).getByRole("checkbox");
}

async function openPublishDialog(page) {
  await page.getByRole("button", { name: "Công khai thời khoá biểu" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  // The checkbox grid loads asynchronously (GET publish-status) behind a
  // spinner — wait for the first checkbox to actually render.
  await dialog.getByRole("checkbox").first().waitFor({ timeout: 10000 });
  return dialog;
}

module.exports = {
  loginApiOnly,
  seedMinimalSchoolYear,
  scheduleWeekCompletely,
  publishWeeks,
  cellLocator,
  weekLabel,
  weekCheckbox,
  openPublishDialog,
};
