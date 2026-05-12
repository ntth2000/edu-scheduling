"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error?.message ?? "Đăng nhập thất bại";
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
    <>
      <div className="mb-8 lg:hidden text-center">
        <h1 className="text-[48px] leading-[1.1] font-bold text-[#191b23]">EduSchedule</h1>
      </div>
      <div className="mb-10">
        <h2 className="text-[32px] font-bold text-[#191b23] mb-2">Đăng nhập</h2>
        <p className="font-normal text-[14px] leading-[20px] text-[#424754]">Chào mừng bạn quay lại! Vui lòng đăng nhập vào tài khoản của bạn.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label className="font-semibold text-[16px] leading-[24px] text-[#191b23]" htmlFor="username">Email</Label>
          <div className="relative flex items-center">
            <Mail className="absolute left-4 h-5 w-5 text-[#727785] z-10" />
            <Input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-12 pr-4 h-[56px] rounded-xl border-[#c2c6d6] bg-[#f9f9ff] focus-visible:ring-2 focus-visible:ring-[#005ac2] focus-visible:border-[#005ac2] border transition-all text-[#191b23] placeholder:text-[#727785] font-normal text-[14px] leading-[20px]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <Label className="font-semibold text-[16px] leading-[24px] text-[#191b23]" htmlFor="password">Mật khẩu</Label>
            <a className="font-normal text-[14px] leading-[20px] text-[#005ac2] hover:text-[#004395] transition-colors cursor-pointer">Quên mật khẩu?</a>
          </div>
          <div className="relative flex items-center">
            <Lock className="absolute left-4 h-5 w-5 text-[#727785] z-10" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 h-[56px] rounded-xl border-[#c2c6d6] bg-[#f9f9ff] focus-visible:ring-2 focus-visible:ring-[#005ac2] focus-visible:border-[#005ac2] border transition-all text-[#191b23] placeholder:text-[#727785] font-normal text-[14px] leading-[20px]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 text-[#727785] hover:text-[#191b23] z-10"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-red-600 text-[14px]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          disabled={loading}
          className="w-full h-[56px] mt-2 bg-[#005ac2] text-white hover:bg-[#004395] rounded-full text-[16px] leading-[24px] font-semibold"
          type="submit"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="font-normal text-[14px] leading-[20px] text-[#424754]">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-[16px] leading-[24px] text-[#005ac2] hover:underline cursor-pointer">Đăng kí tại đây</Link>
        </p>
      </div>
    </>
  );
}
