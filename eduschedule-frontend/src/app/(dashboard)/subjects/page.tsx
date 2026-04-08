import { SubjectTable } from "@/components/subjects/SubjectTable";
import { TypographyH2 } from "@/components/ui/typography";

export default function SubjectsPage() {
  return (
    <div className="p-8 flex-1 flex flex-col gap-8">
      <TypographyH2 title="Quản lý Môn học" subtitle="Cấu hình danh mục môn học và phân bổ tiết dạy theo quy định của nhà trường." />
      <SubjectTable />
    </div>
  );
}
