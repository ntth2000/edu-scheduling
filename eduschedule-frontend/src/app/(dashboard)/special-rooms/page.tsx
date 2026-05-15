import { SpecialRoomTable } from "@/components/special-rooms/SpecialRoomTable";
import { TypographyH3 } from "@/components/ui/typography";

export default function SpecialRoomsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 p-4 bg-white border-b border-sidebar-border">
        <TypographyH3
          title="Phòng chức năng"
          subtitle="Quản lý phòng học chuyên biệt và giới hạn số lớp sử dụng đồng thời khi xếp thời khóa biểu."
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-8">
        <SpecialRoomTable />
      </div>
    </div>
  );
}
