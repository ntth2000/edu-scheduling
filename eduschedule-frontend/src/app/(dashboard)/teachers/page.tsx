import { TeacherTable } from "@/components/teachers/TeacherTable";
import { TypographyH2 } from "@/components/ui/typography";

export default function TeachersPage() {
  return (
    <div className="p-8 flex-1 flex flex-col gap-8">
      <TypographyH2 title="Quản lý Giáo viên" subtitle="Quản lý hồ sơ giáo viên, phân loại và theo dõi số tiết giảng dạy." />
      <TeacherTable />
    </div>
  );
}
