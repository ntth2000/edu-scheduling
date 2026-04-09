import { Users, GraduationCap, BookOpen, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TypographyH4 } from "@/components/ui/typography";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  teacherApi,
  classApi,
  mapTeacher,
  mapClass,
  type TeacherResponse,
  type ClassResponse,
} from "@/lib/api";

export default async function DashboardPage() {
  const [teacherResponses, classResponses] = await Promise.all([
    teacherApi.getAll().catch((): TeacherResponse[] => []),
    classApi.getAll().catch((): ClassResponse[] => []),
  ]);

  const teachers = teacherResponses.map(mapTeacher);
  const classes = classResponses.map(mapClass);

  const subjectCount = new Set(teachers.flatMap((t) => t.subjects)).size;

  const stats = [
    {
      label: "Tổng giáo viên",
      value: teachers.length,
      icon: Users,
      bg: "bg-md-primary-fixed/30",
      text: "text-md-primary",
      iconBg: "text-md-primary/5",
    },
    {
      label: "Tổng lớp học",
      value: classes.length,
      icon: GraduationCap,
      bg: "bg-md-secondary-fixed/30",
      text: "text-md-secondary",
      iconBg: "text-md-secondary/5",
    },
    {
      label: "Tổng môn học",
      value: subjectCount,
      icon: BookOpen,
      bg: "bg-md-surface-container-highest/30",
      text: "text-md-on-surface",
      iconBg: "text-md-on-surface/5",
    },
    {
      label: "Chưa có GVCN",
      value: classes.filter((c) => !c.homeroomTeacher).length,
      icon: AlertTriangle,
      bg: "bg-md-error-container",
      text: "text-md-on-error-container",
      iconBg: "text-md-error/5",
    },
  ];

  const incompleteClasses = classes.filter((c) => c.assignmentStatus === "incomplete");

  return (
    <div className="p-8 space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} p-6 rounded-xl relative overflow-hidden group`}>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">
                  {stat.label}
                </p>
                <h4 className={`text-3xl font-extrabold font-heading ${stat.text}`}>
                  {String(stat.value).padStart(2, "0")}
                </h4>
              </div>
              <Icon className={`absolute -right-4 -bottom-4 h-20 w-20 ${stat.iconBg} rotate-12 group-hover:scale-110 transition-transform`} />
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left: Recent Teachers */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-md-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-md-surface-container-low/30 border-b border-md-outline-variant/10">
              <TypographyH4 title="Giáo viên gần đây" />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-md-surface-container-low/50">
                  <TableRow>
                    <TableHead className="px-6">Họ tên</TableHead>
                    <TableHead className="px-6">Loại GV</TableHead>
                    <TableHead className="px-6">Môn dạy</TableHead>
                    <TableHead className="px-6 text-center">Tiết/Tuần</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-slate-500 italic">
                        Chưa có giáo viên
                      </TableCell>
                    </TableRow>
                  ) : (
                    teachers.slice(0, 5).map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs select-none">
                              {teacher.name.at(-1)?.toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">{teacher.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6">
                          <Badge
                            className={
                              teacher.type === "GVCN"
                                ? "bg-blue-100 text-blue-700 border-transparent"
                                : "bg-slate-100 text-slate-600 border-transparent"
                            }
                          >
                            {teacher.type === "GVCN" ? "GVCN" : "Bộ môn"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 text-sm text-slate-600 italic">
                          {teacher.subjects.join(", ") || "—"}
                        </TableCell>
                        <TableCell className="px-6 text-center text-sm font-semibold">
                          {teacher.currentPeriods}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right: Alerts */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-md-surface-container-lowest rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-md-on-surface mb-4 flex items-center gap-2 font-heading">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Cảnh báo tải
            </h3>
            <div className="space-y-3">
              {teachers
                .filter((t) => t.currentPeriods / t.maxPeriods >= 0.9)
                .slice(0, 3)
                .map((t) => (
                  <div key={t.id} className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                    <p className="text-xs font-semibold text-amber-800">GV gần đạt giới hạn</p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      {t.name}: {t.currentPeriods}/{t.maxPeriods} tiết ({Math.round((t.currentPeriods / t.maxPeriods) * 100)}%)
                    </p>
                  </div>
                ))}
              {teachers.filter((t) => t.currentPeriods / t.maxPeriods >= 0.9).length === 0 && (
                <p className="text-xs text-slate-400 italic">Không có cảnh báo nào</p>
              )}
            </div>
          </div>

          <div className="bg-md-surface-container-lowest rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-md-on-surface mb-4 font-heading">
              Lớp chưa có GVCN
            </h3>
            <div className="space-y-2">
              {incompleteClasses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Tất cả lớp đã có GVCN</p>
              ) : (
                incompleteClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 bg-md-surface-container-low rounded-lg"
                  >
                    <span className="text-sm font-medium">Lớp {cls.name}</span>
                    <Badge className="bg-amber-100 text-amber-700 border-transparent">
                      Chưa đủ
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
