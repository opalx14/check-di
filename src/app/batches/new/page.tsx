"use client";

import { ArrowLeft, Loader2, PackagePlus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function messageFor(error: string) {
  if (error === "public_id_exists") return "Mã lô này đã tồn tại.";
  if (error === "invalid_public_id") return "Mã lô chưa hợp lệ.";
  return "Không thể tạo lô. Kiểm tra lại dữ liệu và thử lại.";
}

export default function NewBatchPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productName: form.get("productName"),
        origin: form.get("origin"),
        publicId: form.get("publicId") || undefined,
      }),
    });

    const payload = (await response.json()) as {
      ok: boolean;
      error?: string;
      links?: { manage: string };
    };

    if (!response.ok || !payload.links?.manage) {
      setError(messageFor(payload.error ?? "unknown_error"));
      setSubmitting(false);
      return;
    }

    router.push(payload.links.manage);
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-2xl">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" />
          Check-Di
        </a>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/95 shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 p-5 sm:p-7">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
              <PackagePlus className="size-5" />
            </div>
            <h1 className="font-display mt-4 text-2xl font-extrabold text-white sm:text-3xl">Tạo lô sản phẩm</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Tạo batch trước, sau đó từng đơn vị mới thêm và xác nhận chặng của mình. Mã hash chỉ sinh khi chặng được xác nhận.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-7">
            <Field label="Tên sản phẩm" name="productName" placeholder="Ví dụ: Sầu riêng Ri6" required />
            <Field label="Nguồn gốc ban đầu" name="origin" placeholder="Ví dụ: Krông Pắc, Đắk Lắk" required />
            <div>
              <label htmlFor="publicId" className="text-xs font-semibold text-slate-300">Mã lô công khai <span className="text-slate-500">(không bắt buộc)</span></label>
              <input
                id="publicId"
                name="publicId"
                placeholder="Ví dụ: DUR-260830-02"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">Để trống thì Check-Di tự sinh mã.</p>
            </div>

            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-amber-100/80">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
              Dữ liệu hiện lưu bền trên local server cho prototype. Chữ ký dùng demo organization key; chưa phải key production và chưa ghi Solana Devnet.
            </div>

            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
              {submitting ? "Đang tạo lô..." : "Tạo lô và quản lý hành trình"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-xs font-semibold text-slate-300">{label}</label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/50"
      />
    </div>
  );
}
