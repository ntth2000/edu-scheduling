import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/lib/api", () => ({
  schoolYearApi: { getAll: vi.fn() },
  timetableApi: { getBySchoolYear: vi.fn() },
  weekApi: {
    getByTimetable: vi.fn(),
    updateStartDate: vi.fn(),
    applyForward: vi.fn(),
  },
}));

import { schoolYearApi, timetableApi, weekApi } from "@/lib/api";
import { TimetableListPage } from "./TimetableListPage";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const YEAR = { id: 1, name: "2025-2026", startYear: 2025 };

const TM_HK1 = {
  id: 10,
  schoolYearId: 1,
  schoolYearName: "2025-2026",
  semesterOrder: 1,
  createdAt: "2025-09-01T00:00:00",
};

const TM_HK2 = {
  id: 20,
  schoolYearId: 1,
  schoolYearName: "2025-2026",
  semesterOrder: 2,
  createdAt: "2026-01-01T00:00:00",
};

// 2 tuần, startDate là thứ Hai
const WEEKS_HK1 = [
  { id: 101, timetableId: 10, weekNumber: 1, startDate: "2025-09-08", endDate: "2025-09-14" },
  { id: 102, timetableId: 10, weekNumber: 2, startDate: "2025-09-15", endDate: "2025-09-21" },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function setup() {
  vi.mocked(schoolYearApi.getAll).mockResolvedValue([YEAR]);
  vi.mocked(timetableApi.getBySchoolYear).mockResolvedValue([TM_HK1, TM_HK2]);
  vi.mocked(weekApi.getByTimetable).mockImplementation((id) =>
    Promise.resolve(id === 10 ? WEEKS_HK1 : [])
  );
  return render(<TimetableListPage />);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("TimetableListPage — happy path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  // 1. Render 2 card ─────────────────────────────────────────────────────────
  it("hiển thị đúng 2 card Học kì 1 và Học kì 2", async () => {
    setup();

    expect(await screen.findByText("Học kì 1")).toBeInTheDocument();
    expect(screen.getByText("Học kì 2")).toBeInTheDocument();
  });

  // 2. Dữ liệu tuần được hiển thị đúng ──────────────────────────────────────
  it("card HK1 hiển thị đúng startDate, endDate và tổng số tuần", async () => {
    setup();
    await screen.findByText("Học kì 1");

    // startDate = weeks[0].startDate
    expect(screen.getAllByDisplayValue("2025-09-08")[0]).toBeInTheDocument();

    // endDate = weeks[last].endDate → 21/09/2025
    expect(screen.getByText("21/09/2025")).toBeInTheDocument();

    // totalWeeks = 2
    expect(screen.getByText("2 tuần")).toBeInTheDocument();
  });

  // 3. Mở TKB navigate đúng ──────────────────────────────────────────────────
  it("nút Mở TKB navigate đến /timetable/{id}?year=...", async () => {
    setup();
    await screen.findByText("Học kì 1");

    const openButtons = screen.getAllByRole("button", { name: /Mở TKB/i });
    await userEvent.click(openButtons[0]); // HK1

    expect(mockPush).toHaveBeenCalledWith("/timetable/10?year=2025-2026");
  });

  // 4. Chọn ngày thứ Hai → hiện nút Cập nhật, không lỗi ────────────────────
  it("chọn ngày thứ Hai hợp lệ → hiện nút Cập nhật, không hiện lỗi", async () => {
    setup();
    await screen.findByText("Học kì 1");

    const dateInput = screen.getAllByDisplayValue("2025-09-08")[0];
    fireEvent.change(dateInput, { target: { value: "2025-09-15" } }); // thứ Hai

    expect(screen.queryByText(/Vui lòng chọn ngày thứ Hai/)).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Cập nhật/i })).toBeInTheDocument();
  });

  // 5. Chọn ngày không phải thứ Hai → hiện lỗi ─────────────────────────────
  it("chọn ngày không phải thứ Hai → hiện thông báo lỗi, không hiện nút Cập nhật", async () => {
    setup();
    await screen.findByText("Học kì 1");

    const dateInput = screen.getAllByDisplayValue("2025-09-08")[0];
    fireEvent.change(dateInput, { target: { value: "2025-09-10" } }); // thứ Tư

    expect(await screen.findByText(/Vui lòng chọn ngày thứ Hai/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cập nhật/i })).not.toBeInTheDocument();
  });

  // 6. Có weeks → đổi ngày → bấm Cập nhật → hiện confirmation dialog ────────
  it("đổi startDate khi đã có weeks → hiện confirmation dialog", async () => {
    setup();
    await screen.findByText("Học kì 1");

    fireEvent.change(screen.getAllByDisplayValue("2025-09-08")[0], {
      target: { value: "2025-09-15" },
    });

    await userEvent.click(await screen.findByRole("button", { name: /Cập nhật/i }));

    expect(await screen.findByText("Thay đổi ngày bắt đầu?")).toBeInTheDocument();
    expect(screen.getByText(/Dữ liệu tiết học không bị xoá/)).toBeInTheDocument();
  });

  // 7. Xác nhận dialog → gọi đúng API theo thứ tự ───────────────────────────
  it("xác nhận dialog → gọi updateStartDate rồi applyForward với đúng tham số", async () => {
    vi.mocked(weekApi.updateStartDate).mockResolvedValue(WEEKS_HK1);
    vi.mocked(weekApi.applyForward).mockResolvedValue(undefined);
    vi.mocked(weekApi.getByTimetable).mockResolvedValue(WEEKS_HK1);
    setup();

    await screen.findByText("Học kì 1");

    fireEvent.change(screen.getAllByDisplayValue("2025-09-08")[0], {
      target: { value: "2025-09-15" },
    });
    await userEvent.click(await screen.findByRole("button", { name: /Cập nhật/i }));
    await screen.findByText("Thay đổi ngày bắt đầu?");

    await userEvent.click(screen.getByRole("button", { name: /Xác nhận/i }));

    await waitFor(() => {
      expect(weekApi.updateStartDate).toHaveBeenCalledWith(101, "2025-09-15");
      expect(weekApi.applyForward).toHaveBeenCalledWith(101);
    });
  });

  // 8. Huỷ dialog → không gọi API ───────────────────────────────────────────
  it("huỷ confirmation dialog → không gọi updateStartDate", async () => {
    setup();
    await screen.findByText("Học kì 1");

    fireEvent.change(screen.getAllByDisplayValue("2025-09-08")[0], {
      target: { value: "2025-09-15" },
    });
    await userEvent.click(await screen.findByRole("button", { name: /Cập nhật/i }));
    await screen.findByText("Thay đổi ngày bắt đầu?");

    await userEvent.click(screen.getByRole("button", { name: /Huỷ/i }));

    expect(weekApi.updateStartDate).not.toHaveBeenCalled();
  });
});
