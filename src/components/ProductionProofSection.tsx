"use client";

import {
  ArrowRight,
  Check,
  FileDown,
  Fingerprint,
  RadioTower,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/lib/i18n";

const PUBLIC_ID = "DUR-260830-01";

export function ProductionProofSection() {
  const { locale } = useI18n();
  const vi = locale === "vi";
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  async function shareDemo() {
    const url = window.location.origin + "/";
    const title = vi
      ? "Check-Di · Quét QR, xem nguồn gốc, kiểm tra proof thật"
      : "Check-Di · Scan QR, trace origin, verify live proof";
    const text = vi
      ? "Demo live Check-Di: truy xuất 5 chặng, AI/Data Checks, chain chữ ký, Solana Devnet và audit dossier."
      : "Live Check-Di demo: 5-stage traceability, AI/Data Checks, signed chain, Solana Devnet and audit dossier.";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setShareState("copied");
        window.setTimeout(() => setShareState("idle"), 1800);
      } catch {
        // Keep the page usable even when clipboard permission is unavailable.
      }
    }
  }

  const checks = [
    {
      icon: Fingerprint,
      label: vi ? "Chuỗi chữ ký" : "Signed chain",
      value: "5/5",
      detail: vi
        ? "SHA-256 + Ed25519 + previous hash đều hợp lệ."
        : "SHA-256 + Ed25519 + previous-hash checks all pass.",
    },
    {
      icon: RadioTower,
      label: "Solana Devnet",
      value: "5/5",
      detail: vi
        ? "Registry/Event PDA được đọc lại trực tiếp từ Devnet."
        : "Registry/Event PDAs are re-read directly from Devnet.",
    },
    {
      icon: ShieldCheck,
      label: vi ? "Kiểm tra độc lập" : "Independent verifier",
      value: "Fresh RPC",
      detail: vi
        ? "Không tin mirror/TXID đã lưu khi quyết định proof hợp lệ."
        : "Validity does not trust persisted mirror addresses or TXIDs.",
    },
    {
      icon: FileDown,
      label: vi ? "Hồ sơ audit" : "Audit dossier",
      value: "Redacted",
      detail: vi
        ? "Có hash, chữ ký và proof; không xuất chứng từ gốc hay đường dẫn private."
        : "Includes hashes, signatures and proof without raw private documents.",
    },
  ];

  return (
    <section className="border-t border-white/5 bg-[#070b13]/70 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.08] via-[#0b111c] to-cyan-500/[0.05] shadow-2xl shadow-black/20">
          <div className="grid gap-0 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-white/8 p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                {vi ? "Đang chạy production" : "Live in production"}
              </div>

              <h2 className="font-display mt-4 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">
                {vi ? "Không chỉ là mockup." : "More than a mockup."}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
                {vi
                  ? "Mở lô Ri6 đang có trên production để kiểm tra chuỗi chữ ký, Solana Devnet và hồ sơ audit bằng dữ liệu proof thật."
                  : "Open the live Ri6 production batch to inspect the signed chain, Solana Devnet state and redacted audit export."}
              </p>

              <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                  {vi ? "Lô proof công khai" : "Public proof batch"}
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-cyan-300">
                  {PUBLIC_ID}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {vi ? "Sầu riêng Ri6 · 5 chặng" : "Ri6 durian · 5 stages"}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`/verify/${PUBLIC_ID}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
                >
                  {vi ? "Mở proof live" : "Open live proof"}
                  <ArrowRight className="size-3.5" />
                </a>
                <a
                  href={`/api/verify/${PUBLIC_ID}/dossier`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  <FileDown className="size-3.5" />
                  {vi ? "Tải audit JSON" : "Download audit JSON"}
                </a>
                <button
                  type="button"
                  onClick={shareDemo}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/10"
                >
                  {shareState === "copied" ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Share2 className="size-3.5" />
                  )}
                  {shareState === "copied"
                    ? vi
                      ? "Đã sao chép link"
                      : "Link copied"
                    : vi
                      ? "Chia sẻ demo"
                      : "Share demo"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7 lg:p-8">
              {checks.map(({ icon: Icon, label, value, detail }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300">
                      <Icon className="size-4" />
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      {value}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-bold text-white">{label}</p>
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
