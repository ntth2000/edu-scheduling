"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarDays,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Giáo viên", href: "/teachers", icon: Users },
  { label: "Lớp học", href: "/classes", icon: GraduationCap },
  { label: "Môn học", href: "/subjects", icon: BookOpen },
  { label: "Phân công giảng dạy", href: "/assignments", icon: ClipboardList },
  { label: "Thời khoá biểu", href: "/timetable", icon: CalendarDays },
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
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">
              Hệ thống Quản lý
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
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
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="py-5 px-4 text-slate-600 hover:bg-red-50 hover:text-red-600">
              <button className="flex w-full items-center gap-3" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="font-medium text-sm">Đăng xuất</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
