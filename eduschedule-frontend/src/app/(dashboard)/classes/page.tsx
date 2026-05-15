import { ClassTable } from "@/components/classes/ClassTable";
import { TypographyH3 } from "@/components/ui/typography";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { year } = await searchParams;
  const schoolYear = typeof year === "string" ? year : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-4 bg-white border-b border-sidebar-border">
        <TypographyH3 title="Quản lý Lớp học" subtitle="Quản lý danh sách lớp học và phân công giáo viên chủ nhiệm." />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
        <ClassTable year={schoolYear} />
      </div>
    </div>
  );
}
