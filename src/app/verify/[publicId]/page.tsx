import {
  Bot,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileDown,
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

import { ConsumerJourneyStepper } from "@/components/ConsumerJourneyStepper";
import { ConsumerVerifyTourGuide } from "@/components/ConsumerVerifyTourGuide";
import { IndependentDevnetVerifier } from "@/components/IndependentDevnetVerifier";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { batchRepository } from "@/lib/db";
import { redactForPublicDisplay } from "@/lib/ai/pii-redaction";
import { getServerDictionary } from "@/lib/i18n/server";
import type {
  ConsumerVerifyDictionary,
  Locale,
} from "@/lib/i18n/types";
import { productVisualForName } from "@/lib/product-visuals";
import {
  verifyTraceEventSolanaProof,
  type SolanaProofVerification,
} from "@/lib/solana/verification";
import type { TraceEvent } from "@/types/evidence";

export const dynamic = "force-dynamic";

const stageMeta = {
  production: { icon: Sprout },
  packing: { icon: Warehouse },
  inspection: { icon: PackageCheck },
  logistics: { icon: Truck },
  retail: { icon: MapPin },
} as const;

function shorten(value?: string, left = 8, right = 6) {
  if (!value) return "—";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function formatTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default async function VerifyBatchPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const { locale, dict } = await getServerDictionary();
  const copy = dict.consumerVerify;
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
        <header className="flex items-center justify-between gap-3 border-b border-white/8 pb-5">
          <a href="/" className="font-display font-bold text-white">Check-Di</a>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <LanguageSwitcher />
            <a
              href={`/api/verify/${encodeURIComponent(batch.publicId)}/dossier`}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10"
            >
              <FileDown className="size-3.5" /> {copy.downloadAuditDossier}
            </a>
            <a href="/scan" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
              <QrCode className="size-3.5" /> {copy.scanAnother}
            </a>
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0b111c] shadow-2xl shadow-black/25" data-tour="verify-product-card">
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

              <div className="mt-6 grid gap-2 sm:grid-cols-4" data-tour="verify-status-chips">
                <StatusChip
                  icon={batch.chainVerification.valid ? ShieldCheck : ShieldAlert}
                  label={batch.chainVerification.valid ? copy.chainValid : copy.needsCheck}
                  good={batch.chainVerification.valid}
                />
                <StatusChip
                  icon={Bot}
                  label={warnings === 0 ? copy.aiNoWarnings : copy.aiWarnings.replace("{{count}}", String(warnings))}
                  good={warnings === 0}
                />
                <StatusChip
                  icon={Hash}
                  label={copy.devnetProof
                    .replace("{{anchored}}", String(anchoredCount))
                    .replace("{{total}}", String(batch.events.length))}
                  good={anchoredCount > 0}
                />
                <StatusChip
                  icon={CheckCircle2}
                  label={hasSignedProductPhoto ? copy.sourcePhotoSigned : copy.sourcePhotoMissing}
                  good={hasSignedProductPhoto}
                />
              </div>

              <ConsumerJourneyStepper
                events={batch.events.map((event, index) => ({
                  id: event.id,
                  stage: event.stage,
                  organizationName: redactForPublicDisplay(event.organizationName),
                  location: event.location,
                  occurredAt: event.occurredAt,
                  summary: redactForPublicDisplay(event.summary),
                  lifecycleStatus: event.status,
                  warningCount: (event.aiValidations ?? []).filter(
                    (validation) => validation.status !== "matched",
                  ).length,
                  devnetVerified: solanaChecks[index]?.valid === true,
                  eventPda: solanaChecks[index]?.eventPda,
                }))}
              />
            </div>
          </div>
        </section>

        <div className="mt-6">
          <IndependentDevnetVerifier publicId={batch.publicId} />
        </div>

        <section className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{copy.traceDetails}</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-white">
                {copy.confirmedStages.replace("{{count}}", String(batch.events.length))}
              </h2>
            </div>
            <span className="text-[10px] text-slate-500">{copy.tapStageProof}</span>
          </div>

          <div className="mt-4 space-y-2" data-tour="verify-event-cards">
            {batch.events.map((event, index) => (
              <TraceEventCard
                key={event.id}
                event={event}
                index={index}
                solanaCheck={solanaChecks[index]}
                copy={copy}
                locale={locale}
              />
            ))}
          </div>
        </section>
      </div>

      <ConsumerVerifyTourGuide />
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

function TraceEventCard({
  event,
  index,
  solanaCheck,
  copy,
  locale,
}: {
  event: TraceEvent;
  index: number;
  solanaCheck: SolanaProofVerification;
  copy: ConsumerVerifyDictionary;
  locale: Locale;
}) {
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
            <p className="text-sm font-bold text-white">{index + 1}. {copy.stages[event.stage]}</p>
            {!terminal && <CheckCircle2 className="size-3.5 text-emerald-400" />}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{redactForPublicDisplay(event.organizationName)} · {event.location}</p>
        </div>
        <span className="hidden text-[10px] text-slate-500 sm:block">{formatTime(event.occurredAt, locale)}</span>
        <ChevronRight className="size-4 text-slate-500 transition group-open:rotate-90" />
      </summary>

      <div className="border-t border-white/8 px-4 pb-4 pt-3">
        <p className="text-xs leading-relaxed text-slate-300">{redactForPublicDisplay(event.summary)}</p>

        {(event.aiValidations ?? []).length > 0 && (
          <div className="mt-3 space-y-2">
            {(event.aiValidations ?? []).map((validation) => (
              <div
                key={validation.message}
                className="rounded-xl border border-white/8 bg-white/[0.025] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-300">
                    {redactForPublicDisplay(validation.message)}
                  </span>
                  {validation.severity && (
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400">
                      {validation.severity}
                    </span>
                  )}
                </div>
                {validation.evidence && (
                  <div className="mt-2 grid gap-1 font-mono text-[9px] text-slate-500 sm:grid-cols-3">
                    <span>{copy.field}: {validation.evidence.sourceField}</span>
                    <span>
                      {copy.extracted}: {validation.evidence.extractedValue !== undefined ? redactForPublicDisplay(String(validation.evidence.extractedValue)) : "—"}
                    </span>
                    <span>
                      {copy.expected}: {validation.evidence.expectedValue !== undefined ? redactForPublicDisplay(String(validation.evidence.expectedValue)) : "—"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <MiniInfo label={copy.documents} value={`${documents.length} file`} />
          <MiniInfo label={copy.eventHash} value={shorten(event.eventHash)} mono />
          <MiniInfo label={copy.signer} value={shorten(event.signerPublicKey)} mono />
          <MiniInfo
            label={copy.devnetTxid}
            value={event.solanaProof?.transactionSignature ? shorten(event.solanaProof.transactionSignature) : copy.notAnchored}
            mono
          />
        </div>

        {documents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {documents.map((document) => (
              <span key={document.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-400">
                {document.mimeType.startsWith("image/") ? copy.signedImage : redactForPublicDisplay(document.filename)} · SHA {shorten(document.sha256)}
              </span>
            ))}
          </div>
        )}

        {solanaCheck.valid && event.solanaProof?.explorerUrl && (
          <a href={event.solanaProof.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
            {copy.viewSolanaProof} <ExternalLink className="size-3.5" />
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
