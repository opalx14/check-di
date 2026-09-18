"use client";

import { ArrowLeft, Building2, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TourGuide, type TourStep } from "@/components/TourGuide";

function loginErrorMessage(error: string) {
  if (error === "invalid_credentials") {
    return "Email hoặc mật khẩu chưa đúng.";
  }
  return "Không thể đăng nhập vào tổ chức. Vui lòng thử lại.";
}

const LOGIN_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="demo-credentials"]',
    title: "Tài khoản demo nhà sản xuất",
    description: "Check-Di có sẵn tài khoản demo với email và mật khẩu điền sẵn, giúp bạn truy cập ngay kho sản phẩm và quản lý lô hàng mà không cần đăng ký phức tạp.",
  },
  {
    target: '[data-tour="login-form"]',
    title: "Xác thực tổ chức an toàn",
    description: "Phiên làm việc được duy trì qua HttpOnly cookie server-side, bảo vệ danh tính doanh nghiệp và tích hợp trực tiếp với quyền ký ví Phantom.",
  },
  {
    target: '[data-tour="login-submit"]',
    title: "Mở kho sản phẩm",
    description: "Bấm nút 'Đăng nhập' để bắt đầu quản lý danh mục sản phẩm, liên kết ví Phantom và tạo lô hàng mới.",
    actionLabel: "Khám phá kho sản phẩm →",
    actionHref: "/supplier?tour=1",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      memberships?: { organizationName: string; role: string }[];
    };

    if (!response.ok || !payload.ok) {
      setError(loginErrorMessage(payload.error ?? "login_failed"));
      setSubmitting(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/") ? next : "/supplier");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-md">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" />
          Check-Di
        </a>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/95 shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 p-5 sm:p-7" data-tour="login-header">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
              <Building2 className="size-5" />
            </div>
            <h1 className="font-display mt-4 text-2xl font-extrabold text-white sm:text-3xl">
              Đăng nhập nhà cung cấp
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Email xác định tài khoản nhà sản xuất; Phantom dùng để ký dữ liệu của lô.
            </p>
            <div className="mt-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-3 text-xs text-slate-300" data-tour="demo-credentials">
              <p className="font-semibold text-emerald-300">Tài khoản demo nhà sản xuất</p>
              <p className="mt-1 font-mono text-[11px]">producer.demo@check-di.local</p>
              <p className="mt-1 font-mono text-[11px]">CheckDiDemo2026!</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-7" data-tour="login-form">
            <div>
              <label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue="producer.demo@check-di.local"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                placeholder="producer@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-semibold text-slate-300">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                defaultValue="CheckDiDemo2026!"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3 text-xs text-slate-300">
              <ShieldCheck className="size-4 shrink-0 text-cyan-300" />
              Phiên đăng nhập được bảo vệ bằng HttpOnly cookie.
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-tour="login-submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </section>
      </div>

      <TourGuide
        tourKey="supplier_login"
        flowTitle="Hướng dẫn đăng nhập"
        role="supplier"
        steps={LOGIN_TOUR_STEPS}
      />
    </main>
  );
}
