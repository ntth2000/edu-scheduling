# EduSchedule

Ứng dụng xếp thời khóa biểu cho trường tiểu học: quản lý giáo viên/lớp/môn, phân công giảng dạy, tự động xếp lịch, publish TKB để tra cứu công khai.

## Tính năng chính

- Quản lý danh mục: giáo viên, lớp, môn học
- Phân công giảng dạy, cấu hình lịch nghỉ
- Xếp TKB tự động (Timefold Solver) + xếp tay, kiểm tra xung đột realtime
- Vòng đời TKB: draft → publish, xem lại TKB cũ
- Tra cứu TKB công khai (không cần đăng nhập)
- Export Excel/PDF

## Tech stack

- **Backend**: Spring Boot, PostgreSQL, Timefold Solver
- **Frontend**: Next.js, React, TypeScript

## Cài đặt & chạy

Xem [INSTALLATION.md](INSTALLATION.md).
