// UC12-09 — Xếp tự động lại sau khi cấu hình phòng thay đổi [Normal]
// Steps: cấu hình phòng chức năng với số lượng giới hạn, sau đó chạy xếp tự
// động cho một tuần có nhiều lớp cần dùng phòng đó -> Expect: kết quả xếp
// không có thời điểm nào có số lớp dùng phòng vượt quá số lượng hiện có.
//
// Not draft/published-related: this only exercises the room-capacity hard
// constraint already implemented in GreedyPhase/TimetableConstraintProvider,
// independent of the (not yet built) publish feature.
//
// Setup uses 4 classes each taught by a *different* teacher for the same
// subject/room, so nothing else (teacher/class conflict) would force them
// apart — only the room-capacity check can prevent them from landing on the
// same (day, session, period). This makes the assertion meaningful rather
// than incidentally true.
const {
  run,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  apiPost,
  cookieHeaderFrom,
  API_URL,
} = require("../_shared/helpers");

const ROOM_QUANTITY = 1;
const CLASS_COUNT = 4;
const PERIODS_PER_WEEK = 3;

run(async (page, context) => {
  const { username, password } = await registerTestUser("uc12_09");
  await loginUI(page, username, password);
  const cookie = await cookieHeaderFrom(context);

  const startYear = 2000 + Math.floor(Math.random() * 90);
  const schoolYear = await apiPost("/api/school-years", { startYear }, cookie);

  const timetables = await apiGet(`/api/timetables?schoolYearId=${schoolYear.id}`, cookie);
  const semester1 = timetables.find((t) => t.semesterOrder === 1);
  assert(semester1, "expected semester 1 timetable to be auto-created with the school year");

  const weeks = await apiGet(`/api/weeks?timetableId=${semester1.id}`, cookie);
  const week1 = weeks.find((w) => w.weekNumber === 1);
  assert(week1, "expected week 1 to be auto-created with semester 1");

  const subject = await apiPost(
    "/api/subjects",
    {
      name: `Tin học TS ${Date.now()}`,
      periodsGrade1: PERIODS_PER_WEEK,
      periodsGrade2: 0,
      periodsGrade3: 0,
      periodsGrade4: 0,
      periodsGrade5: 0,
    },
    cookie
  );

  const room = await apiPost(
    "/api/special-rooms",
    { name: `Phòng máy TS ${Date.now()}`, quantity: ROOM_QUANTITY, subjectId: subject.id },
    cookie
  );

  for (let i = 0; i < CLASS_COUNT; i++) {
    const teacher = await apiPost(
      "/api/teachers",
      { fullName: `GV TS ${i} ${Date.now()}`, type: "BO_MON", maxPeriodsPerWeek: 20, subjectIds: [subject.id] },
      cookie
    );
    const schoolClass = await apiPost(
      "/api/classes",
      { name: `1TS${i}_${Date.now() % 100000}`, grade: 1, schoolYearId: schoolYear.id },
      cookie
    );
    await apiPost(
      "/api/assignments",
      { classId: schoolClass.id, subjectId: subject.id, teacherId: teacher.id },
      cookie
    );
  }

  const genRes = await fetch(`${API_URL}/api/weeks/${week1.id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  assert(genRes.status === 200 || genRes.status === 400, `unexpected HTTP ${genRes.status} from /generate`);
  const result = await genRes.json();

  const subjectSlots = result.slots.filter((s) => s.subjectId === subject.id);
  assert(subjectSlots.length > 0, "expected at least some periods of the room-bound subject to be placed");

  const occupancy = new Map();
  for (const s of subjectSlots) {
    const key = `${s.day}_${s.period}`;
    occupancy.set(key, (occupancy.get(key) || 0) + 1);
  }
  const overCapacity = [...occupancy.entries()].filter(([, count]) => count > ROOM_QUANTITY);
  assert(
    overCapacity.length === 0,
    `expected no timeslot to exceed room quantity ${ROOM_QUANTITY}, but found: ${JSON.stringify(overCapacity)}`
  );

  console.log(
    `  (info) placed ${subjectSlots.length}/${CLASS_COUNT * PERIODS_PER_WEEK} periods, ` +
      `${result.errors.length} unplaceable, room capacity respected across ${occupancy.size} distinct timeslots`
  );
});
