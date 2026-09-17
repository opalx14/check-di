import {
  Bot,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Hash,
  MapPin,
  PackageCheck,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Truck,
  Warehouse,
} from "lucide-react";
import { notFound } from "next/navigation";

import { batchRepository } from "@/lib/db";
import { productVisualForName } from "@/lib/product-visuals";
import {
  verifyTraceEventSolanaProof,
  type SolanaProofVerification,
} from "@/lib/solana/verification";
import type { TraceEvent } from "@/types/evidence";

export const dynamic = "force-dynamic";

const stageMeta = {
  production: { label: "Thu hoạch", icon: Sprout },
  packing: { label: "Đóng gói", icon: Warehouse },
  inspection: { label: "Kiểm định", icon: PackageCheck },
  logistics: { label: "Vận chuyển", icon: Truck },
  retail: { label: "Điểm bán", icon: MapPin },
} as const;

function shorten(value?: string, left = 8, right = 6) {
  if (!value) return "—";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default async function VerifyBatchPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const batch = await batchRepository.getPublicProof(publicId);
  if (!batch || batch.events.length === 0) notFound();

  const visual = productVisualForName(batch.productName);
  const hasSignedProductPhoto = batch.events.some((event) =>
    event.documentEvidence?.some((document) => document.mimeType.startsWith("image/")),
  );
  const destination = batch.events.at(-1)?.location ?? batch.origin;
  const aiChecks = batch.events.flatMap((event) => event.aiValidations ?? []);
  const warnings = aiChecks.filter((check) => check.status !== "matched").length;
  const solanaChecks = await Promise.all(
    batch.events.map((event) => verifyTraceEventSolanaProof(batch.publicId, event)),
  );
  const anchoredCount = solanaChecks.filter((check) => check.valid).length;

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex items-center justify-between border-b border-white/8 pb-5">
          <a href="/" className="font-display font-bold text-white">Check-Di</a>
          <a href="/scan" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
            <QrCode className="size-3.5" /> Quét mã khác
          </a>
        </header>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-2xl shadow-black/25">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[320px] overflow-hidden lg:min-h-[420px]">
              <img
                src={
                  hasSignedProductPhoto
                    ? `/api/batches/${encodeURIComponent(batch.publicId)}/photo`
                    : visual.imageUrl
                }
                alt={batch.productName}
                className="absolute inset-0 size-full object-cover"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${visual.accent} via-transparent to-black/10`} />
              <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur">
                {visual.label}
              </div>
            </div>

            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{batch.publicId}</p>
                  <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{batch.productName}</h1>
                  <p className="mt-2 text-sm text-slate-400">{batch.origin} → {destination}</p>
                </div>
                <div className="hidden rounded-2xl bg-white p-2 sm:block">
                  <img src={`/api/qr/${encodeURIComponent(batch.publicId)}`} alt={`QR ${batch.publicId}`} className="size-20" />
                </div>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-4">
                <StatusChip
                  icon={batch.chainVerification.valid ? ShieldCheck : ShieldAlert}
                  label={batch.chainVerification.valid ? "Chuỗi hợp lệ" : "Cần kiểm tra"}
                  good={batch.chainVerification.valid}
                />
                <StatusChip icon={Bot} label={warnings === 0 ? "AI không cảnh báo" : `${warnings} cảnh báo`} good={warnings === 0} />
                <StatusChip icon={Hash} label={`${anchoredCount}/${batch.events.length} Devnet proof`} good={anchoredCount > 0} />
                <StatusChip icon={CheckCircle2} label={hasSignedProductPhoto ? "Ảnh nguồn đã ký" : "Chưa có ảnh ký"} good={hasSignedProductPhoto} />
              </div>

              <div className="mt-7 border-t border-white/8 pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Hành trình</p>
                <div className="mt-4 flex items-start justify-between gap-1">
                  {batch.events.map((event, index) => {
                    const meta = stageMeta[event.stage];
                    const Icon = meta.icon;
                    return (
                      <div key={event.id} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className="relative z-10 flex size-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          <Icon className="size-4" />
                        </div>
                        <p className="mt-2 max-w-[80px] text-[10px] font-semibold text-slate-200 sm:text-[11px]">{meta.label}</p>
                        {index < batch.events.length - 1 && <span className="absolute left-[62%] top-[18px] h-px w-[76%] bg-gradient-to-r from-emerald-400/45 to-cyan-400/25" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Trace details</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-white">{batch.events.length} chặng đã xác nhận</h2>
            </div>
            <span className="text-[10px] text-slate-500">Nhấn từng chặng để xem proof</span>
          </div>

          <div className="mt-4 space-y-2">
            {batch.events.map((event, index) => (
              <TraceEventCard key={event.id} event={event} index={index} solanaCheck={solanaChecks[index]} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusChip({ icon: Icon, label, good }: { icon: typeof ShieldCheck; label: string; good: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${good ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300" : "border-amber-500/20 bg-amber-500/[0.06] text-amber-200"}`}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function TraceEventCard({ event, index, solanaCheck }: { event: TraceEvent; index: number; solanaCheck: SolanaProofVerification }) {
  const meta = stageMeta[event.stage];
  const Icon = meta.icon;
  const terminal = event.status === "revoked" || event.status === "superseded";
  const documents = event.documentEvidence ?? [];

  return (
    <details className={`group rounded-2xl border bg-[#0b111c] ${terminal ? "border-red-500/20" : "border-white/8 open:border-cyan-500/20"}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${terminal ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">{index + 1}. {meta.label}</p>
            {!terminal && <CheckCircle2 className="size-3.5 text-emerald-400" />}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{event.organizationName} · {event.location}</p>
        </div>
        <span className="hidden text-[10px] text-slate-500 sm:block">{formatTime(event.occurredAt)}</span>
        <ChevronRight className="size-4 text-slate-500 transition group-open:rotate-90" />
      </summary>

      <div className="border-t border-white/8 px-4 pb-4 pt-3">
        <p className="text-xs leading-relaxed text-slate-300">{event.summary}</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <MiniInfo label="Ảnh / chứng từ" value={`${documents.length} file`} />
          <MiniInfo label="Event hash" value={shorten(event.eventHash)} mono />
          <MiniInfo label="Signer" value={shorten(event.signerPublicKey)} mono />
          <MiniInfo
            label="Devnet TXID"
            value={event.solanaProof?.transactionSignature ? shorten(event.solanaProof.transactionSignature) : "Chưa ghi"}
            mono
          />
        </div>

        {documents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {documents.map((document) => (
              <span key={document.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-400">
                {document.mimeType.startsWith("image/") ? "Ảnh đã ký" : document.filename} · SHA {shorten(document.sha256)}
              </span>
            ))}
          </div>
        )}

        {solanaCheck.valid && event.solanaProof?.explorerUrl && (
          <a href={event.solanaProof.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
            Xem Solana proof <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </details>
  );
}

function MiniInfo({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <p className="text-[9px] uppercase tracking-[0.15em] text-slate-600">{label}</p>
      <p className={`mt-1 truncate text-xs text-slate-300 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
