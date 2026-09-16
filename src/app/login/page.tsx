"use client";

import { ArrowLeft, Building2, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function loginErrorMessage(error: string) {
  if (error === "invalid_credentials") {
    return "Email hoặc mật khẩu chưa đúng.";
  }
  return "Không thể đăng nhập vào tổ chức. Vui lòng thử lại.";
}

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
    router.push(next?.startsWith("/") ? next : "/batches/new");
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
          <div className="border-b border-white/10 p-5 sm:p-7">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
              <Building2 className="size-5" />
            </div>
            <h1 className="font-display mt-4 text-2xl font-extrabold text-white sm:text-3xl">
              Đăng nhập tổ chức
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Dùng tài khoản Supabase Auth đã được gắn membership để ghi nhận và xác nhận chặng thuộc đơn vị của bạn.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-7">
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
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                placeholder="operator@example.com"
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
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-start gap-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3 text-xs leading-relaxed text-slate-300">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-300" />
              Session được giữ bằng HttpOnly cookie. Quyền thực tế vẫn lấy từ membership `owner / operator / inspector / viewer` trong database.
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
