"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  CalendarDays,
  LogOut,
  DoorOpen,
  CalendarCheck,
  Plus,
  Settings,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { schoolYearApi, type SchoolYearResponse } from "@/lib/api";
import { CreateSchoolYearDialog } from "@/components/school-year/CreateSchoolYearDialog";
import { ManageSchoolYearsDialog } from "@/components/school-year/ManageSchoolYearsDialog";

const MANAGE_YEARS_VALUE = "__manage__";

const GLOBAL_ITEMS = [
  { label: "Giáo viên", href: "/teachers", icon: Users },
  { label: "Môn học", href: "/subjects", icon: BookOpen },
  { label: "Phòng chức năng", href: "/special-rooms", icon: DoorOpen },
];

const getYearSubItems = (yearName: string) => [
  { label: "Lớp học", href: `/classes?year=${yearName}`, base: "/classes", icon: GraduationCap },
  { label: "Phân công giảng dạy", href: `/assignments?year=${yearName}`, base: "/assignments", icon: ClipboardList },
  { label: "Xếp TKB", href: `/timetable?year=${yearName}`, base: "/timetable", icon: CalendarCheck },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year");

  const [schoolYears, setSchoolYears] = useState<SchoolYearResponse[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = sessionStorage.getItem("selectedYearId");
    return saved ? Number(saved) : null;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  useEffect(() => {
    schoolYearApi.getAll().then((years) => {
      setSchoolYears(years);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const year = (e as CustomEvent<SchoolYearResponse>).detail;
      setSchoolYears((prev) => {
        if (prev.some((y) => y.id === year.id)) return prev;
        return [year, ...prev];
      });
      setSelectedYearId(year.id);
    };
    window.addEventListener("schoolyear:created", handler);
    return () => window.removeEventListener("schoolyear:created", handler);
  }, []);

  useEffect(() => {
    if (!schoolYears.length) return;
    if (yearParam) {
      const matched = schoolYears.find((y) => y.name === yearParam);
      const id = matched?.id ?? schoolYears[0].id;
      setSelectedYearId(id);
      sessionStorage.setItem("selectedYearId", String(id));
    } else {
      setSelectedYearId((prev) => {
        if (prev !== null && schoolYears.some((y) => y.id === prev)) return prev;
        const saved = sessionStorage.getItem("selectedYearId");
        const savedId = saved ? Number(saved) : null;
        if (savedId && schoolYears.some((y) => y.id === savedId)) return savedId;
        return schoolYears[0].id;
      });
    }
  }, [yearParam, schoolYears]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  };

  const handleCreated = (year: SchoolYearResponse) => {
    setSchoolYears((prev) => [year, ...prev]);
    setSelectedYearId(year.id);
    sessionStorage.setItem("selectedYearId", String(year.id));
    router.push(`/classes?year=${year.name}`);
  };

  const handleYearDeleted = (id: number) => {
    setSchoolYears((prev) => {
      const next = prev.filter((y) => y.id !== id);
      setSelectedYearId((prevSelected) => {
        if (prevSelected !== id) return prevSelected;
        const fallback = next[0]?.id ?? null;
        if (fallback) sessionStorage.setItem("selectedYearId", String(fallback));
        else sessionStorage.removeItem("selectedYearId");
        return fallback;
      });
      return next;
    });
  };

  const selectedYear = schoolYears.find((y) => y.id === selectedYearId) ?? null;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-md-primary flex items-center justify-center text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-extrabold text-blue-800 leading-none font-heading">
            EduSchedule
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold tracking-wider text-slate-500 mb-1 uppercase">
            Dữ liệu chung
          </SidebarGroupLabel>
          <SidebarMenu>
            {GLOBAL_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} className="py-5 px-4 mb-1">
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

        {/* ── Năm học ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-bold tracking-wider text-slate-500 mb-2 uppercase mt-2">
            Năm học
          </SidebarGroupLabel>

          {selectedYear && (
            <>
              {/* Year switcher */}
              <Select
                value={String(selectedYear.id)}
                onValueChange={(v) => {
                  if (v === MANAGE_YEARS_VALUE) {
                    setIsManageDialogOpen(true);
                    return;
                  }
                  const newYearId = Number(v);
                  setSelectedYearId(newYearId);
                  sessionStorage.setItem("selectedYearId", String(newYearId));
                  const newYear = schoolYears.find((y) => y.id === newYearId);
                  if (newYear) {
                    const yearBases = ["/classes", "/assignments", "/timetable"];
                    const matchedBase = yearBases.find((base) => pathname.startsWith(base));
                    if (matchedBase) router.push(`${matchedBase}?year=${newYear.name}`);
                  }
                }}
              >
                <SelectTrigger className="mb-3 h-10 bg-slate-100/80 border-0 text-blue-600 font-semibold hover:bg-slate-200/80 focus:ring-0 focus:ring-offset-0">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {schoolYears.map((y) => (
                    <SelectItem key={y.id} value={String(y.id)}>
                      {y.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={MANAGE_YEARS_VALUE} className="text-slate-500">
                    <Settings className="h-4 w-4" />
                    <span>Quản lý năm học</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Sub-items */}
              <SidebarMenuSub className="ml-3 border-l border-slate-200 px-0 gap-1">
                {getYearSubItems(selectedYear.name).map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuSubItem key={index}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === item.base}
                        className="py-5 px-4 ml-2 text-slate-700 hover:bg-slate-50"
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span className="font-medium text-[14px]">{item.label}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            </>
          )}
        </SidebarGroup>

        {/* ── Tạo năm học mới ── */}
        <SidebarGroup className="mt-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsDialogOpen(true)}
                className="py-4 px-4 text-slate-500 hover:text-blue-600 border border-dashed border-slate-200 hover:border-blue-300 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium text-sm">Tạo năm học mới</span>
              </SidebarMenuButton>
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

      <CreateSchoolYearDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={handleCreated}
      />

      <ManageSchoolYearsDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        schoolYears={schoolYears}
        onDeleted={handleYearDeleted}
      />
    </Sidebar>
  );
}
