import {
  Building2,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Hash,
  KeyRound,
  Link2,
  QrCode,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { batchRepository } from "@/lib/db";
import { CHECK_DI_REGISTRY_PROGRAM_ID } from "@/lib/solana/config";
import { getDevnetRegistryProgramStatus } from "@/lib/solana/server";
import { verifyTraceEventSolanaProof } from "@/lib/solana/verification";

export const dynamic = "force-dynamic";

const DEMO_PUBLIC_ID = "DUR-260830-01";

function short(value?: string, left = 10, right = 8) {
  if (!value) return "—";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

export default async function JudgeDemoPage() {
  const [batch, program] = await Promise.all([
    batchRepository.getPublicProof(DEMO_PUBLIC_ID),
    getDevnetRegistryProgramStatus().catch(() => null),
  ]);

  const events = batch?.events ?? [];
  const solanaChecks = batch
    ? await Promise.all(
        events.map((event) =>
          verifyTraceEventSolanaProof(batch.publicId, event).catch(() => ({
            valid: false,
            kind: undefined,
          })),
        ),
      )
    : [];
  const registryVerified = solanaChecks.filter(
    (check) => check.valid && check.kind === "check-di-registry",
  ).length;
  const documentCount = events.reduce(
    (sum, event) => sum + (event.documentEvidence?.length ?? 0),
    0,
  );
  const terminalCount = events.filter(
    (event) => event.status === "revoked" || event.status === "superseded",
  ).length;
  const sampleEvent = [...events]
    .reverse()
    .find((event) => event.solanaProof?.kind === "check-di-registry");

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="font-display text-lg font-black text-white">
            Check-Di
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-bold text-cyan-300">
              JUDGE DEMO CONSOLE
            </span>
            <a
              href="/judge/creditcoin"
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15"
            >
              Creditcoin lane
            </a>
            <a
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              Landing
            </a>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 shadow-2xl sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
            Một sản phẩm · Hai track · Một nguồn dữ liệu
          </p>
          <div className="mt-3 grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <h1 className="font-display text-3xl font-black tracking-tight text-white sm:text-5xl">
                Bắt đầu chấm Check-Di ở đây
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Product & Business lane trả lời <span className="font-semibold text-white">điều gì đã xảy ra trong chuỗi cung ứng</span>.
                Technical / Blockchain lane chứng minh <span className="font-semibold text-white">bản ghi đã xác nhận có còn nguyên vẹn và ai đã ký</span>.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="size-4" />
                <p className="text-sm font-bold">Live readiness</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Program {program?.deployed ? "đang executable trên Devnet" : "status chưa đọc được"}. Sample hiện có {events.length} finalized event, {registryVerified} Registry proof verify live.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <TrackCard
            eyebrow="Product & Business Track"
            title="Doanh nghiệp nhìn thấy hành trình và trách nhiệm"
            icon={Building2}
            points={[
              "Organization → batch → trace events → documents → AI checks",
              "QR/public verify cho người tiêu dùng",
              "Evidence giữ off-chain/private; AI chỉ cross-check và cảnh báo",
              "Revoked/superseded không xóa lịch sử, luôn giữ audit trail",
            ]}
            primaryHref={`/verify/${encodeURIComponent(DEMO_PUBLIC_ID)}`}
            primaryLabel="Mở consumer journey"
            secondaryHref="/batches/new"
            secondaryLabel="Tạo lô / management flow"
          />

          <TrackCard
            eyebrow="Technical / Blockchain Track"
            title="Hash chain + Phantom signer + Event PDA"
            icon={Hash}
            points={[
              "Canonical payload → SHA-256 eventHash → Ed25519 signature",
              "Phantom organization signer dùng cùng identity off-chain/on-chain",
              "Custom check_di_registry: Batch PDA + Event PDA trên Solana Devnet",
              "Lifecycle active → revoked|superseded có live RPC verification",
            ]}
            primaryHref={`https://explorer.solana.com/address/${encodeURIComponent(CHECK_DI_REGISTRY_PROGRAM_ID)}?cluster=devnet`}
            primaryLabel="Mở deployed program"
            secondaryHref="/organization/wallet"
            secondaryLabel="Mở Phantom linking"
            externalPrimary
          />
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                Live sample · {DEMO_PUBLIC_ID}
              </p>
              <h2 className="font-display mt-1 text-xl font-bold text-white">Proof snapshot để chấm nhanh</h2>
            </div>
            <a
              href={`/api/batches/${encodeURIComponent(DEMO_PUBLIC_ID)}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              JSON proof <ExternalLink className="size-3.5" />
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Finalized events" value={`${events.length}`} icon={Link2} />
            <Metric label="Chain" value={batch?.chainVerification.valid ? "Valid" : "Check"} icon={CheckCircle2} />
            <Metric label="Registry live" value={`${registryVerified}/${events.length || 0}`} icon={ShieldCheck} />
            <Metric label="Documents" value={`${documentCount}`} icon={FileCheck2} />
            <Metric label="Terminal" value={`${terminalCount}`} icon={Sparkles} />
            <Metric label="Program" value={program?.deployed ? "Deployed" : "Unknown"} icon={KeyRound} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ProofLine label="Program ID" value={CHECK_DI_REGISTRY_PROGRAM_ID} />
            <ProofLine label="Sample Event PDA" value={sampleEvent?.solanaProof?.eventPda ?? "Chưa có trong sample"} />
            <ProofLine label="Organization signer" value={sampleEvent?.solanaProof?.organizationPublicKey ?? sampleEvent?.signerPublicKey ?? "—"} />
            <ProofLine label="Event hash" value={sampleEvent?.eventHash ?? "—"} />
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <DemoStep
            number="01"
            title="Xem Business lane"
            text="Mở consumer journey, xem organization, location, documents, AI checks và trạng thái lifecycle."
            href={`/verify/${encodeURIComponent(DEMO_PUBLIC_ID)}`}
            icon={QrCode}
          />
          <DemoStep
            number="02"
            title="Xem Blockchain lane"
            text={`Đối chiếu event hash, signer, Event PDA và custom program ${short(CHECK_DI_REGISTRY_PROGRAM_ID)} trên Devnet.`}
            href={`https://explorer.solana.com/address/${encodeURIComponent(CHECK_DI_REGISTRY_PROGRAM_ID)}?cluster=devnet`}
            icon={ShieldCheck}
            external
          />
          <DemoStep
            number="03"
            title="Thử organization flow"
            text="Đăng nhập owner → link Phantom → tạo/confirm event → ký Registry transaction → revoke/supersede nếu cần."
            href="/login"
            icon={WalletCards}
          />
        </section>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-500">
          Check-Di không phát hành token, không custody tài sản và không đưa raw document/PII lên chain. Solana chỉ giữ integrity/status proof tối thiểu.
        </p>
      </div>
    </main>
  );
}

function TrackCard({
  eyebrow,
  title,
  icon: Icon,
  points,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  externalPrimary = false,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Building2;
  points: string[];
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  externalPrimary?: boolean;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6">
      <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
      <h2 className="font-display mt-2 text-xl font-bold text-white">{title}</h2>
      <ul className="mt-4 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-xs leading-relaxed text-slate-400">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={primaryHref}
          target={externalPrimary ? "_blank" : undefined}
          rel={externalPrimary ? "noreferrer" : undefined}
          className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
        >
          {primaryLabel}
          {externalPrimary && <ExternalLink className="size-3.5" />}
        </a>
        <a
          href={secondaryHref}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
        >
          {secondaryLabel}
        </a>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Link2;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        <Icon className="size-3" /> {label}
      </div>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ProofLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-[10px] text-slate-300" title={value}>
        {value}
      </p>
    </div>
  );
}

function DemoStep({
  number,
  title,
  text,
  href,
  icon: Icon,
  external = false,
}: {
  number: string;
  title: string;
  text: string;
  href: string;
  icon: typeof QrCode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group rounded-2xl border border-white/10 bg-[#0b111c]/90 p-4 transition hover:border-cyan-500/25 hover:bg-cyan-500/[0.04]"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-cyan-300">{number}</span>
        <Icon className="size-4 text-slate-500 transition group-hover:text-cyan-300" />
      </div>
      <p className="mt-3 text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
    </a>
  );
}
