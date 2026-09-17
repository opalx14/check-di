"use client";

import { ArrowRight, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuickLookupSection() {
  const router = useRouter();
  const [value, setValue] = useState("DUR-260830-01");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const publicId = value.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!publicId) return;
    router.push(`/verify/${encodeURIComponent(publicId)}`);
  }

  return (
    <section className="border-t border-white/5 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-cyan-500/15 bg-gradient-to-r from-cyan-500/[0.08] via-[#0b111c] to-emerald-500/[0.06] p-5 sm:p-7">
          <div className="grid items-center gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">[04 // TRA CỨU]</p>
              <h2 className="font-display mt-2 text-2xl font-extrabold text-white sm:text-3xl">Có mã lô? Kiểm tra ngay.</h2>
              <p className="mt-2 text-sm text-slate-400">Hoặc mở camera để quét QR trên sản phẩm.</p>
            </div>

            <div>
              <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <QrCode className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cyan-300" />
                  <input
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/65 py-3 pl-10 pr-4 font-mono text-sm text-white outline-none focus:border-cyan-500/40"
                    aria-label="Mã lô"
                  />
                </div>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">
                  Kiểm tra
                  <ArrowRight className="size-4" />
                </button>
                <a href="/scan" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200">
                  Mở camera
                </a>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
