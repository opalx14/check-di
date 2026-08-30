import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Hash,
  KeyRound,
  MapPin,
  PackageCheck,
  QrCode,
  ShieldCheck,
  Signature,
  Sprout,
  Truck,
  Warehouse,
} from "lucide-react";
import { notFound } from "next/navigation";

import { batchRepository } from "@/lib/db/persistent-store";
import type { TraceEvent } from "@/types/evidence";

export const dynamic = "force-dynamic";

const stageMeta = {
  production: { label: "Thu hoạch", icon: Sprout },
  packing: { label: "Đóng gói", icon: Warehouse },
  inspection: { label: "Kiểm định", icon: PackageCheck },
  logistics: { label: "Vận chuyển", icon: Truck },
  retail: { label: "Điểm bán", icon: MapPin },
} as const;

function shorten(value: string | undefined, left = 10, right = 8) {
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

export default async function VerifyBatchPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const batch = await batchRepository.getPublicProof(publicId);

  if (!batch || batch.events.length === 0) notFound();

  const destination = batch.events.at(-1)?.location ?? batch.origin;
  const aiChecks = batch.events.flatMap((event) => event.aiValidations ?? []);
  const warnings = aiChecks.filter((check) => check.status !== "matched");

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />

      <div className="relative mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <a href="/" className="font-display text-lg font-black tracking-tight text-white">
            Check-Di
          </a>
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 font-mono text-[10px] font-bold text-amber-300">
            DEMO · CHƯA GHI DEVNET
          </span>
        </header>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c]/95 shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Mã lô {batch.publicId}</p>
                <h1 className="font-display mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {batch.productName}
                </h1>
                <p className="mt-1 text-sm text-slate-400">{batch.origin} → {destination}</p>
              </div>
              <div className="hidden rounded-2xl bg-white p-2 sm:block">
                <img
                  src={`/api/qr/${encodeURIComponent(batch.publicId)}`}
                  alt={`QR xác minh lô ${batch.publicId}`}
                  className="size-24"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <ShieldCheck className="size-4" />
                  <p className="text-sm font-bold">Chuỗi hash & chữ ký hợp lệ</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {batch.chainVerification.valid
                    ? `${batch.events.length}/${batch.events.length} chặng nối đúng previous hash và chữ ký Ed25519 kiểm tra được.`
                    : "Phát hiện chặng không khớp chuỗi integrity."}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Bot className="size-4" />
                  <p className="text-sm font-bold">AI check fixture</p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {warnings.length === 0
                    ? `${aiChecks.length} kiểm tra dữ liệu mẫu đều khớp.`
                    : `${warnings.length} cảnh báo cần xem lại.`}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Hành trình</p>
                <h2 className="font-display mt-1 text-lg font-bold text-white">{batch.events.length} trạm · {batch.events.length} lần xác nhận</h2>
              </div>
              <span className="font-mono text-[10px] text-emerald-300">SHA-256 + Ed25519</span>
            </div>

            <div className="mt-5 space-y-3">
              {batch.events.map((event, index) => (
                <TraceEventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b111c]/90 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-slate-200">
            <QrCode className="size-4 text-cyan-300" />
            <h2 className="font-display text-base font-bold">QR công khai của lô</h2>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="rounded-2xl bg-white p-2 sm:hidden">
              <img
                src={`/api/qr/${encodeURIComponent(batch.publicId)}`}
                alt={`QR xác minh lô ${batch.publicId}`}
                className="size-24"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs leading-relaxed text-slate-400">
                QR này mở trực tiếp trang <span className="font-mono text-cyan-300">/verify/{batch.publicId}</span> trên domain đang chạy.
              </p>
              <a
                href={`/api/batches/${encodeURIComponent(batch.publicId)}`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Xem JSON proof
                <ChevronRight className="size-3.5" />
              </a>
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
          Demo key được tạo deterministic để kiểm thử chữ ký. Đây chưa phải khóa danh tính production và chưa anchor lên Solana Devnet.
        </p>
      </div>
    </main>
  );
}

function TraceEventCard({ event, index }: { event: TraceEvent; index: number }) {
  const meta = stageMeta[event.stage];
  const Icon = meta.icon;
  const aiChecks = event.aiValidations ?? [];

  return (
    <details className="group rounded-2xl border border-white/8 bg-slate-900/45 open:border-cyan-500/20 open:bg-cyan-950/10">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display truncate text-sm font-bold text-white">{index + 1}. {meta.label}</p>
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{event.organizationName} · {event.location}</p>
        </div>
        <span className="hidden font-mono text-[10px] text-slate-500 sm:block">{formatTime(event.occurredAt)}</span>
        <ChevronRight className="size-4 text-slate-500 transition group-open:rotate-90" />
      </summary>

      <div className="border-t border-white/8 px-4 pb-4 pt-3">
        <p className="text-xs leading-relaxed text-slate-300">{event.summary}</p>

        {aiChecks.length > 0 && (
          <div className="mt-3 space-y-2">
            {aiChecks.map((check) => (
              <div key={check.message} className="flex items-start gap-2 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.05] p-3 text-xs text-slate-300">
                <Bot className="mt-0.5 size-3.5 shrink-0 text-cyan-300" />
                <span>{check.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 grid gap-2 font-mono text-[10px] sm:grid-cols-2">
          <ProofLine icon={Hash} label="Previous hash" value={shorten(event.previousEventHash)} />
          <ProofLine icon={Hash} label="Event hash" value={shorten(event.eventHash, 14, 10)} accent="emerald" />
          <ProofLine icon={KeyRound} label="Signer public key" value={shorten(event.signerPublicKey, 14, 10)} accent="cyan" />
          <ProofLine icon={Signature} label="Ed25519 signature" value={shorten(event.signature, 14, 10)} accent="purple" />
        </div>
      </div>
    </details>
  );
}

function ProofLine({
  icon: Icon,
  label,
  value,
  accent = "slate",
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  accent?: "slate" | "emerald" | "cyan" | "purple";
}) {
  const accentClass = {
    slate: "text-slate-300",
    emerald: "text-emerald-300",
    cyan: "text-cyan-300",
    purple: "text-purple-300",
  }[accent];

  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="size-3" />
        <span>{label}</span>
      </div>
      <p className={`mt-1 truncate ${accentClass}`}>{value}</p>
    </div>
  );
}
