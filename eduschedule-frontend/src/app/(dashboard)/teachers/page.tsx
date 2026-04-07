import { TeacherTable } from "@/components/teachers/TeacherTable";
import { TypographyH2, TypographyP } from "@/components/ui/typography";

export default function TeachersPage() {
  return (
    <>
      <div className="p-8 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <TypographyH2 title="Quản lý Giáo viên" />
          </div>
        </div>
        <TeacherTable />
      </div>
    </>
  );
}
