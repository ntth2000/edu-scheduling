// UC13-13 — Thay đổi dữ liệu đầu vào không làm đổi tuần đã công bố [Normal]
// Steps: công bố một tuần và ghi nhận môn học, giáo viên cùng vị trí các
// tiết -> thay đổi phân công giảng dạy có liên quan -> mở lại tuần đã công
// bố và một tuần chưa công bố cùng học kỳ -> mở URL công khai -> Expect:
// tuần đã công bố và dữ liệu đang hiển thị trên URL công khai giữ nguyên
// như thời điểm công bố; dữ liệu đầu vào mới chỉ được sử dụng để xây dựng
// hoặc kiểm tra các tuần chưa công bố.
//
// Trước đây có bug thật ở đây (đã sửa): `Slot` chỉ tham chiếu `Assignment`
// qua FK, nên `SlotResponse.teacherName`/`subjectName` tính "sống" từ
// Assignment mỗi lần đọc — đổi GV của phân công làm lộ thay đổi vào cả tuần
// đã khoá. Đã sửa bằng cách đóng băng `teacherIdSnapshot`/
// `teacherNameSnapshot`/`subjectNameSnapshot` lên từng `Slot` ngay lúc
// `TimetableService.publish()` chạy, và `SlotService`/`PublicTimetableService`
// đọc từ đó thay vì từ Assignment khi `week.isPublished()==true`. Test này
// giờ khẳng định đúng hành vi đã sửa.
const { API_URL, run, assert, registerTestUser } = require("../_shared/helpers");
const { loginApiOnly, seedMinimalSchoolYear, scheduleWeekCompletely, publishWeeks } = require("./_fixtures");

run(async () => {
  const { username, password } = await registerTestUser("uc13_13");
  const cookie = await loginApiOnly(username, password);
  const suffix = Date.now();

  const { semester1, schoolClass, subject, teacher, weeks } = await seedMinimalSchoolYear(cookie, suffix);
  const originalSlots = await scheduleWeekCompletely(weeks[0].id, cookie);
  const published = await publishWeeks(semester1.id, [weeks[0].id], cookie);

  // Đổi dữ liệu đầu vào: gán lại phân công (lớp+môn giữ nguyên) cho một giáo viên khác.
  const teacher2 = await (
    await fetch(`${API_URL}/api/teachers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ fullName: `GV Mới ${suffix}`, maxPeriodsPerWeek: 20, subjectIds: [subject.id] }),
    })
  ).json();
  await fetch(`${API_URL}/api/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ classId: schoolClass.id, subjectId: subject.id, teacherId: teacher2.id }),
  });

  // Tuần đã công bố: cả vị trí (ngày/tiết) lẫn tên GV/môn hiển thị đều phải giữ nguyên.
  const week0SlotsAfter = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[0].id}`, { headers: { Cookie: cookie } })).json();
  assert(
    week0SlotsAfter.length === originalSlots.length &&
      week0SlotsAfter.every((s) => originalSlots.some((o) => o.id === s.id && o.day === s.day && o.period === s.period)),
    "expected the published week's slot positions (day/period) to stay exactly as they were before the reassignment"
  );
  assert(
    week0SlotsAfter.every((s) => s.teacherName === teacher.fullName && s.subjectName === subject.name),
    `expected the published week to still show the original teacher "${teacher.fullName}" and subject "${subject.name}", got ${JSON.stringify(week0SlotsAfter.map((s) => [s.teacherName, s.subjectName]))}`
  );

  const publicSlots = await (await fetch(`${API_URL}/api/public/timetables/${published.publicToken}/slots?weekId=${weeks[0].id}`)).json();
  assert(
    publicSlots.every((s) => s.teacherName === teacher.fullName),
    `expected the public page to also still show "${teacher.fullName}" for the already-published week`
  );

  // Tuần chưa công bố: dữ liệu đầu vào mới (GV mới) phải được dùng khi xây dựng/kiểm tra.
  const generateRes = await fetch(`${API_URL}/api/weeks/${weeks[1].id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  assert(generateRes.status === 200, `expected generate to succeed for the unpublished week, got HTTP ${generateRes.status}`);
  const result = await generateRes.json();
  assert(
    result.slots.length > 0 && result.slots.every((s) => s.teacherId === teacher2.id),
    `expected the unpublished week's generated slot to use the new teacher (id ${teacher2.id}), got ${JSON.stringify(result.slots)}`
  );

  // Bonus: công bố lại tuần 0 sau khi đổi GV phải chụp lại đúng nội dung MỚI (GV mới),
  // chứng tỏ snapshot được làm mới mỗi lần publish chứ không kẹt mãi ở lần đầu.
  await publishWeeks(semester1.id, [weeks[0].id], cookie);
  const week0AfterRepublish = await (await fetch(`${API_URL}/api/slots?weekId=${weeks[0].id}`, { headers: { Cookie: cookie } })).json();
  assert(
    week0AfterRepublish.every((s) => s.teacherName === teacher2.fullName),
    `expected re-publishing to refresh the snapshot to the current teacher "${teacher2.fullName}"`
  );
});
