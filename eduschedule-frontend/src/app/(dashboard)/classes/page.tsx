import { ClassTable } from "@/components/classes/ClassTable";
import { TypographyH2 } from "@/components/ui/typography";

export default function ClassesPage() {
  return (
    <div className="p-8 flex-1 flex flex-col gap-8">
      <TypographyH2 title="Quản lý Lớp học" subtitle="Quản lý danh sách lớp học và phân công giáo viên chủ nhiệm." />
      <ClassTable />
    </div>
  );
}
