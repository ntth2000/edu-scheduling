import { TeacherTable } from "@/components/teachers/TeacherTable";
import { TypographyH3 } from "@/components/ui/typography";

export default function TeachersPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-4 bg-white border-b border-sidebar-border">
        <TypographyH3 title="Quản lý Giáo viên" subtitle="Quản lý hồ sơ giáo viên, phân loại và theo dõi số tiết giảng dạy." />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
        <TeacherTable />
      </div>
    </div>
  );
}
