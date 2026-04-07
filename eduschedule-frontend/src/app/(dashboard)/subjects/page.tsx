import { SubjectTable } from "@/components/subjects/SubjectTable";

export default function SubjectsPage() {
  return (
    <>
      <div className="p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-md-on-surface tracking-tight font-heading">
            Quản lý Môn học
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Cấu hình danh mục môn học và phân bổ tiết dạy theo quy định của nhà trường.
          </p>
        </div>
        <SubjectTable />
      </div>
    </>
  );
}
