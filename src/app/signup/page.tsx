"use client";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getSignupErrorMessage(error: string) {
  if (error === "signup_email_exists") {
    return "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.";
  }
  if (error === "signup_password_too_short") {
    return "Mật khẩu cần tối thiểu 12 ký tự.";
  }
  if (error === "signup_password_too_weak") {
    return "Mật khẩu cần có chữ hoa, chữ thường và chữ số.";
  }
  if (error === "signup_organization_name_invalid") {
    return "Tên tổ chức / doanh nghiệp cần có độ dài từ 2 đến 120 ký tự.";
  }
  if (error === "signup_email_invalid") {
    return "Địa chỉ email không đúng định dạng.";
  }
  if (error === "signup_rate_limit_exceeded" || error === "signup_upstream_rate_limited") {
    return "Tạm thời có quá nhiều yêu cầu đăng ký. Vui lòng đợi khoảng 15 phút rồi thử lại.";
  }
  return "Không thể tạo tài khoản tổ chức. Vui lòng thử lại sau.";
}

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrg, setCreatedOrg] = useState<{
    name: string;
    emailConfirmationRequired?: boolean;
  } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = (form.get("email") as string)?.trim();
    const organizationName = (form.get("organizationName") as string)?.trim();
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          organizationName,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        autoLogin?: boolean;
        emailConfirmationRequired?: boolean;
        hackathonAutoConfirmed?: boolean;
        organization?: { name: string; slug: string };
      };

      if (!response.ok || !payload.ok) {
        setError(getSignupErrorMessage(payload.error ?? "signup_failed"));
        setSubmitting(false);
        return;
      }

      if (payload.autoLogin) {
        const search = new URLSearchParams({ onboarding: "1" });
        if (payload.hackathonAutoConfirmed) {
          search.set("signup", "hackathon-auto-confirmed");
        }
        router.push(`/organization/wallet?${search.toString()}`);
        router.refresh();
      } else {
        // Confirmation required by Supabase settings
        setCreatedOrg({
          name: payload.organization?.name || organizationName,
          emailConfirmationRequired: true,
        });
        setSubmitting(false);
      }
    } catch {
      setError("Có lỗi mạng khi kết nối máy chủ. Vui lòng kiểm tra lại kết nối.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Check-Di
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/95 shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 p-5 sm:p-7">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
              <UserPlus className="size-5" />
            </div>
            <h1 className="font-display mt-4 text-2xl font-extrabold text-white sm:text-3xl">
              Đăng ký tổ chức mới
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Tạo tài khoản quản trị viên và doanh nghiệp để bắt đầu số hóa hành trình chuỗi cung ứng.
            </p>
          </div>

          {createdOrg?.emailConfirmationRequired ? (
            <div className="space-y-5 p-5 sm:p-7">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 text-sm">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="size-5" />
                  Đăng ký tổ chức thành công!
                </div>
                <p className="mt-3 text-slate-300">
                  Tổ chức <strong className="text-white">{createdOrg.name}</strong> đã được khởi tạo.
                </p>
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] p-3 text-xs text-cyan-200">
                  <Mail className="mt-0.5 size-4 shrink-0 text-cyan-400" />
                  <span>
                    Vui lòng kiểm tra hộp thư email của bạn và bấm liên kết xác nhận để kích hoạt tài khoản trước khi đăng nhập.
                  </span>
                </div>
              </div>

              <Link
                href="/login?next=/organization/wallet?onboarding=1"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                Đi đến trang Đăng nhập
                <ExternalLink className="size-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 p-5 sm:p-7">
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Tên tổ chức / Hợp tác xã / Doanh nghiệp
                </label>
                <div className="relative mt-2">
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Ví dụ: HTX Nông Sản Đắk Lắk"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                  />
                  <Building2 className="pointer-events-none absolute right-3.5 top-3.5 size-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Email quản trị viên
                </label>
                <div className="relative mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="admin@doanhnghiep.vn"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                  />
                  <Mail className="pointer-events-none absolute right-3.5 top-3.5 size-4 text-slate-500" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Mật khẩu
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  placeholder="Tối thiểu 12 ký tự"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Xác nhận mật khẩu
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  placeholder="Nhập lại mật khẩu"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>

              <div className="flex items-start gap-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3 text-xs leading-relaxed text-slate-300">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                <span>
                  Tài khoản tự động là Owner của tổ chức mới. Mật khẩu cần tối thiểu 12 ký tự, có chữ hoa, chữ thường và chữ số.
                </span>
              </div>

              {error && (
                <p className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                {submitting ? "Đang tạo tổ chức..." : "Đăng ký tài khoản tổ chức"}
              </button>

              <div className="border-t border-white/10 pt-4 text-center text-xs text-slate-400">
                Đã có tài khoản?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-cyan-300 underline hover:text-cyan-200"
                >
                  Đăng nhập tại đây
                </Link>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
