import { SubjectTable } from "@/components/subjects/SubjectTable";
import { TypographyH3 } from "@/components/ui/typography";

export default function SubjectsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-4 bg-white border-b border-sidebar-border">
        <TypographyH3 title="Quản lý Môn học" subtitle="Cấu hình danh mục môn học và phân bổ tiết dạy theo quy định của nhà trường." />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
        <SubjectTable />
      </div>
    </div>
  );
}
