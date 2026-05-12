"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarDays,
  LogOut,
  DoorOpen,
  ChevronDown,
  CalendarCheck
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

const GLOBAL_ITEMS = [
  { label: "Giáo viên", href: "/teachers", icon: Users },
  { label: "Môn học", href: "/subjects", icon: BookOpen },
  { label: "Phòng chức năng", href: "/special-rooms", icon: DoorOpen },
];

const SCHOOL_YEAR_ITEMS = [
  { label: "Lớp học", href: "/classes", icon: GraduationCap },
  { label: "Phân công giảng dạy", href: "/assignments", icon: ClipboardList },
  { label: "Học kì 1 (Xếp TKB)", href: "/timetable", icon: CalendarCheck },
  { label: "Học kì 2 (Xếp TKB)", href: "/timetable", icon: CalendarCheck },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/timetable");
    router.refresh();
  };

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-md-primary flex items-center justify-center text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-blue-800 leading-none font-heading">
              EduSchedule
            </h1>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Nhóm: Dữ liệu trường */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold tracking-wider text-slate-500 mb-1 uppercase">
            Dữ liệu trường
          </SidebarGroupLabel>
          <SidebarMenu>
            {GLOBAL_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      "py-5 px-4 mb-2",
                      // isActive
                      //   ? "!bg-blue-50 !text-blue-600 shadow-sm shadow-blue-200/50 hover:bg-blue-600 hover:text-white"
                      //   : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    )}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Nhóm: Năm học */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold tracking-wider text-slate-500 mb-1 uppercase mt-2">
            Năm học
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="py-6 px-4 bg-slate-100/80 text-blue-600 hover:bg-slate-200/80 hover:text-blue-700 rounded-xl">
                <div className="flex items-center gap-3 w-full">
                  <CalendarDays className="h-5 w-5" />
                  <span className="font-medium text-[15px] flex-1 text-left">2025-2026</span>
                  <ChevronDown className="h-4 w-4 stroke-[3]" />
                </div>
              </SidebarMenuButton>

              <SidebarMenuSub className="mt-3 ml-6 border-l border-slate-200/80 px-0 gap-2">
                {
                  SCHOOL_YEAR_ITEMS.map((item, index) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <SidebarMenuSubItem key={index}>
                        <SidebarMenuSubButton asChild isActive={isActive} className="py-5 px-4 ml-2 text-slate-700 hover:bg-slate-50">
                          <Link href={item.href}>
                            <Icon className="h-5 w-5" />
                            <span className="font-medium text-[14.5px]">{item.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="py-5 px-4 text-slate-600 hover:bg-red-50 hover:text-red-600">
              <button className="flex w-full items-center gap-3" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="font-medium text-[15px]">Đăng xuất</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
