import Link from "next/link";
import { cookies } from "next/headers";
import { TimetablePage } from "@/components/timetable/TimetablePage";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogIn } from "lucide-react";
import Layout from "@/components/layout";

export default async function TimetableRoute() {
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get("access_token")?.value;

  if (isAuthenticated) {
    return (
      <Layout>
        <TimetablePage />
      </Layout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b border-slate-100 bg-white px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-md-primary flex items-center justify-center">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-extrabold text-blue-900 font-heading text-sm">EduSchedule</span>
          <span className="text-slate-300 mx-1">•</span>
          <span className="text-xs text-slate-500">Thời khoá biểu</span>
        </div>

        <Button asChild size="sm">
          <Link href="/login">
            <LogIn className="h-3.5 w-3.5" />
            Đăng nhập quản trị
          </Link>
        </Button>
      </header>

      <main className="flex-1">
        <TimetablePage readOnly />
      </main>
    </div>
  );
}
