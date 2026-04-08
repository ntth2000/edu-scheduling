import { AssignmentPage } from "@/components/assignments/AssignmentPage";
import { TypographyH2 } from "@/components/ui/typography";

export default function AssignmentsRoute() {
  return (
    <div className="p-8 flex-1 flex flex-col gap-8">
      <TypographyH2 title="Phân công giảng dạy" subtitle="Quản lý và điều phối giáo viên chủ nhiệm & giáo viên bộ môn theo học kỳ." />
      <AssignmentPage />
    </div>
  );
}
