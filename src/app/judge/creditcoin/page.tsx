import {
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  ExternalLink,
  Network,
  ShieldCheck,
} from "lucide-react";

import {
  ATTESTCOIN_NATIVE_VERIFIER_ADDRESS,
  CREDITCOIN_CC3_TESTNET_CHAIN_ID,
} from "@/lib/creditcoin/config";
import { checkCreditcoinReadiness } from "@/lib/creditcoin/readiness";

export const dynamic = "force-dynamic";

function statusLabel(ok: boolean) {
  return ok ? "LIVE" : "NOT READY";
}

export default async function CreditcoinJudgePage() {
  const readiness = await checkCreditcoinReadiness();

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <a href="/judge" className="font-display text-lg font-black text-white">
              Check-Di
            </a>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              BUIDL CTC · Creditcoin / Attestcoin lane
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/creditcoin/readiness"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              JSON readiness <ExternalLink className="size-3.5" />
            </a>
            <a
              href="/judge"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              Judge console
            </a>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 shadow-2xl sm:p-8">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                Cross-chain product provenance
              </p>
              <h1 className="font-display mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Sepolia → Attestcoin → Creditcoin CC3
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
                Check-Di giữ dữ liệu nghiệp vụ và AI off-chain, phát một commitment tối thiểu trên
                Sepolia, rồi chỉ ghi trạng thái provenance trên Creditcoin khi Native Query Verifier
                xác minh transaction/receipt nguồn.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                readiness.networkReady
                  ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                  : "border-amber-500/20 bg-amber-500/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2">
                {readiness.networkReady ? (
                  <CheckCircle2 className="size-4 text-emerald-300" />
                ) : (
                  <CircleAlert className="size-4 text-amber-300" />
                )}
                <p className="text-sm font-bold text-white">
                  Network {statusLabel(readiness.networkReady)}
                </p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {readiness.contractsConfigured
                  ? "Hai contract public address đã được cấu hình."
                  : "Network đã probe; contract chưa deploy/configure nên chưa được phép gọi là end-to-end verified."}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Attestcoin proof API"
            value={statusLabel(readiness.proofApi.ok)}
            detail={readiness.proofApi.detail}
            icon={ShieldCheck}
          />
          <StatusCard
            label="Sepolia attested height"
            value={readiness.attestation.attestedHeight?.toLocaleString() ?? "—"}
            detail={readiness.attestation.detail}
            icon={Network}
          />
          <StatusCard
            label="Creditcoin CC3"
            value={`chain ${readiness.creditcoin.chainId ?? "—"}`}
            detail={readiness.creditcoin.detail}
            icon={DatabaseZap}
          />
          <StatusCard
            label="Contracts"
            value={readiness.contractsConfigured ? "CONFIGURED" : "PENDING DEPLOY"}
            detail={
              readiness.contractsConfigured
                ? "Source + attested registry addresses are present."
                : "No fake deployed/verified claim is shown before real addresses exist."
            }
            icon={CircleAlert}
          />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              Source chain · Ethereum Sepolia
            </p>
            <h2 className="font-display mt-2 text-xl font-bold text-white">CheckDiSourceRegistry</h2>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-400">
              <li>• organization wallet được authorize mới commit journey event.</li>
              <li>• enforce previousEventHash + sequence theo batch.</li>
              <li>• raw documents/PII không đi on-chain.</li>
              <li>• lifecycle Active → Revoked/Superseded vẫn giữ audit history.</li>
            </ul>
            <ProofLine label="Configured source contract" value={readiness.config.sourceContractAddress ?? "Pending real Sepolia deploy"} />
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
              Execution chain · Creditcoin CC3
            </p>
            <h2 className="font-display mt-2 text-xl font-bold text-white">CheckDiAttestedRegistry</h2>
            <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-400">
              <li>• verify proof qua Native Query Verifier trước khi đổi state.</li>
              <li>• decode receipt đã được proof bảo vệ và check đúng source emitter.</li>
              <li>• chống replay theo Attestcoin query + Check-Di eventHash.</li>
              <li>• enforce hash-chain/sequence lần nữa trên Creditcoin.</li>
            </ul>
            <ProofLine label="Native verifier" value={ATTESTCOIN_NATIVE_VERIFIER_ADDRESS} />
            <ProofLine label="Configured CC3 registry" value={readiness.config.registryContractAddress ?? "Pending real CC3 deploy"} />
          </article>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
            Truth gate
          </p>
          <h2 className="font-display mt-2 text-xl font-bold text-white">Khi nào mới được gọi là Verified?</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              "Sepolia source tx thật",
              "Attestcoin proof thật",
              "CC3 execute tx thật",
              "Read-back eventHash khớp",
            ].map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                <p className="font-mono text-[10px] text-cyan-300">0{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Network probe hiện đã xanh. Deployment/proof transaction vẫn được giữ ở trạng thái pending cho tới khi có wallet testnet + faucet funds và địa chỉ contract thật. Target chain ID bắt buộc là {CREDITCOIN_CC3_TESTNET_CHAIN_ID}.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b111c]/95 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="size-4" />
        <p className="text-[10px] uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

function ProofLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 rounded-xl border border-white/8 bg-slate-950/50 p-3">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-[10px] text-slate-300">{value}</p>
    </div>
  );
}
