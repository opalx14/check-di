"use client";

import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Loader2,
  LogOut,
  Plus,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { productVisualForName } from "@/lib/product-visuals";

type Batch = {
  id: string;
  publicId: string;
  productName: string;
  origin: string;
  createdAt: string;
  updatedAt: string;
  events: Array<{
    id: string;
    status: "draft" | "confirmed" | "revoked" | "superseded";
    documentEvidence?: Array<{ mimeType: string }>;
    solanaProof?: {
      status: "confirmed" | "failed";
      transactionSignature?: string;
      explorerUrl?: string;
    };
  }>;
};

type SupplierPayload = {
  ok?: boolean;
  error?: string;
  organization?: {
    id: string;
    name: string;
    role: string;
    walletPublicKey?: string;
  };
  batches?: Batch[];
};

function shortWallet(value?: string) {
  if (!value) return "Chưa liên kết";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function SupplierDashboardClient() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<SupplierPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/supplier/products", { cache: "no-store" })
      .then(async (response) => ({ response, data: (await response.json()) as SupplierPayload }))
      .then(({ response, data }) => {
        if (!active) return;
        setPayload(response.ok ? data : { ok: false, error: data.error ?? "unauthorized" });
      })
      .catch(() => {
        if (active) setPayload({ ok: false, error: "network_error" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const batches = payload?.batches ?? [];
  const stats = useMemo(() => {
    const verified = batches.filter((batch) =>
      batch.events.some((event) => event.solanaProof?.status === "confirmed"),
    ).length;
    return { total: batches.length, verified };
  }, [batches]);

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#07090e] text-slate-300">
        <Loader2 className="size-5 animate-spin text-cyan-300" />
      </main>
    );
  }

  if (!payload?.ok || !payload.organization) {
    return (
      <main className="min-h-screen bg-[#07090e] px-4 py-12 text-slate-100">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0b111c] p-7 text-center shadow-2xl shadow-black/30">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <Boxes className="size-5" />
          </div>
          <h1 className="font-display mt-4 text-2xl font-bold">Kho sản phẩm nhà cung cấp</h1>
          <p className="mt-2 text-sm text-slate-400">Đăng nhập để xem các lô bạn đã tạo và quản lý hành trình.</p>
          <a
            href="/login?next=/supplier"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950"
          >
            Đăng nhập nhà cung cấp
            <ArrowRight className="size-4" />
          </a>
        </div>
      </main>
    );
  }

  const walletLinked = Boolean(payload.organization.walletPublicKey);
  const newestBatch = batches[0];
  const nextAction = !walletLinked
    ? { step: "02", title: "Liên kết Phantom", detail: "Xác minh ví để ký dữ liệu và Registry transaction.", href: "/organization/wallet" }
    : !newestBatch
      ? { step: "03", title: "Tạo sản phẩm", detail: "Chọn loại trái cây, vùng sản xuất và mã lô.", href: "/batches/new" }
      : newestBatch.events.length === 0 || newestBatch.events.every((event) => event.status === "draft")
        ? { step: "04", title: "Chụp ảnh & ký lô", detail: "Ảnh nháp được chụp lại; sau khi ký thì khóa lịch sử.", href: `/batches/${newestBatch.id}` }
        : { step: "05", title: "Tiếp tục hành trình", detail: "Thêm chặng tiếp theo hoặc mở QR công khai.", href: `/batches/${newestBatch.id}` };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/" className="text-sm font-bold text-cyan-300">Check-Di</a>
            <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white">Kho sản phẩm</h1>
            <p className="mt-1 text-sm text-slate-400">{payload.organization.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/organization/wallet"
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                walletLinked
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-200"
              }`}
            >
              <Wallet className="size-3.5" />
              {shortWallet(payload.organization.walletPublicKey)}
            </a>
            <a
              href={walletLinked ? "/batches/new" : "/organization/wallet"}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950"
            >
              <Plus className="size-3.5" />
              {walletLinked ? "Tạo sản phẩm" : "Liên kết Phantom"}
            </a>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Đăng xuất
            </button>
          </div>
        </header>

        {!walletLinked && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100/90">
            <ShieldCheck className="size-4 shrink-0 text-amber-300" />
            Liên kết Phantom trước khi ký xác nhận cho các chặng.
          </div>
        )}

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Sản phẩm" value={String(stats.total)} />
          <Metric label="Có Devnet proof" value={String(stats.verified)} />
          <Metric label="Ví tổ chức" value={walletLinked ? "Đã nối" : "Chưa nối"} />
        </section>

        <a
          href={nextAction.href}
          className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] px-4 py-3 transition hover:bg-cyan-500/[0.08]"
        >
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-300">Bước tiếp theo · {nextAction.step}</p>
            <p className="mt-1 text-sm font-bold text-white">{nextAction.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{nextAction.detail}</p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-cyan-300" />
        </a>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Inventory</p>
              <h2 className="font-display mt-1 text-xl font-bold text-white">Sản phẩm đã tạo</h2>
            </div>
            <a href="/scan" className="text-xs font-semibold text-slate-400 hover:text-white">Xem phía người mua</a>
          </div>

          {batches.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
              <Boxes className="mx-auto size-6 text-slate-500" />
              <p className="mt-3 text-sm font-semibold text-slate-200">Chưa có sản phẩm nào</p>
              <p className="mt-1 text-xs text-slate-500">Tạo lô đầu tiên để bắt đầu ghi hành trình.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {batches.map((batch) => (
                <ProductCard key={batch.id} batch={batch} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0b111c] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="font-display mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function ProductCard({ batch }: { batch: Batch }) {
  const visual = productVisualForName(batch.productName);
  const confirmed = batch.events.filter((event) => event.status !== "draft").length;
  const latestProof = [...batch.events]
    .reverse()
    .find((event) => event.solanaProof?.status === "confirmed")?.solanaProof;
  const hasProof = Boolean(latestProof);
  const hasSignedPhoto = batch.events.some(
    (event) =>
      event.status !== "draft" &&
      event.documentEvidence?.some((document) => document.mimeType.startsWith("image/")),
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-xl shadow-black/15">
      <div className="relative h-44 overflow-hidden">
        <img
          src={
            hasSignedPhoto
              ? `/api/batches/${encodeURIComponent(batch.publicId)}/photo`
              : visual.imageUrl
          }
          alt={batch.productName}
          className="size-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${visual.accent} via-transparent to-black/10`} />
        <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
          {visual.label}
        </div>
        {hasProof && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-1 text-[9px] font-bold text-slate-950">
            <CheckCircle2 className="size-3" /> VERIFIED
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="font-mono text-[10px] text-cyan-300">{batch.publicId}</p>
        <h3 className="font-display mt-1 text-lg font-bold text-white">{batch.productName}</h3>
        <p className="mt-1 text-xs text-slate-400">{batch.origin}</p>

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-500">{confirmed}/5 chặng</span>
          <span className="text-slate-500">{new Date(batch.updatedAt).toLocaleDateString("vi-VN")}</span>
        </div>
        {latestProof?.transactionSignature && (
          <a
            href={latestProof.explorerUrl || `https://explorer.solana.com/tx/${encodeURIComponent(latestProof.transactionSignature)}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block truncate font-mono text-[10px] text-emerald-300 hover:text-emerald-200"
          >
            Devnet TX · {latestProof.transactionSignature.slice(0, 8)}…{latestProof.transactionSignature.slice(-6)} ↗
          </a>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={`/batches/${batch.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950"
          >
            Quản lý
            <ArrowRight className="size-3.5" />
          </a>
          <a
            href={`/verify/${encodeURIComponent(batch.publicId)}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"
          >
            <QrCode className="size-3.5" />
            QR công khai
          </a>
        </div>
      </div>
    </article>
  );
}
