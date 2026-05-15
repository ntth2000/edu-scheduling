import { AssignmentPage } from "@/components/assignments/AssignmentPage";
import { TypographyH3 } from "@/components/ui/typography";

export default async function AssignmentsRoute({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { year } = await searchParams;
  const schoolYear = typeof year === "string" ? year : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-4 bg-white border-b border-sidebar-border">
        <TypographyH3 title="Phân công giảng dạy" subtitle="Quản lý và phân công giáo viên chủ nhiệm & giáo viên bộ môn theo năm học." />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
        <AssignmentPage year={schoolYear} />
      </div>
    </div>
  );
}
