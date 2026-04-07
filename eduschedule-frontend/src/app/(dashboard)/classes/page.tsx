import { ClassTable } from "@/components/classes/ClassTable";
import { Plus } from "lucide-react";

export default function ClassesPage() {
  return (
    <>
      <div className="p-8 flex-1 flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold text-md-on-surface tracking-tight font-heading">
              Quản lý Lớp học
            </h2>
          </div>
        </div>
        <ClassTable />
      </div>
    </>
  );
}
