"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Eye, EyeOff, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCredentialError, setHasCredentialError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasCredentialError(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error?.message ?? "Đăng nhập thất bại";

        // Highlight inputs if it's a credential error (401 or 403)
        if (res.status === 401 || res.status === 403) {
          setHasCredentialError(true);
        } else {
          throw new Error(message);
        }

        setError(message);
        setLoading(false);
        return;
      }

      toast.success("Đăng nhập thành công", { duration: 1000 });
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 500);
    } catch {
      setError("Không thể kết nối đến máy chủ");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-md-primary flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-4">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-blue-900 font-heading">EduSchedule</h1>
          <p className="text-sm text-slate-500 mt-1">Hệ thống Quản lý Trường học</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8">
          <h2 className="text-xl font-bold text-md-on-surface font-heading mb-1">Đăng nhập</h2>
          <p className="text-sm text-slate-500 mb-6">Nhập thông tin tài khoản quản trị để tiếp tục.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field>
              <FieldLabel>Tên đăng nhập</FieldLabel>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoComplete="username"
                autoFocus
                aria-invalid={hasCredentialError}
              />
            </Field>

            <Field>
              <FieldLabel>Mật khẩu</FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={hasCredentialError}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-red-600 text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link
              href="/timetable"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Xem thời khoá biểu
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Chỉ dành cho quản trị viên nhà trường
        </p>
      </div>
    </div>
  );
}
