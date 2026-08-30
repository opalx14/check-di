"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  Signature,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ManagedProductBatch } from "@/lib/db/persistent-store";
import type { TraceEvent } from "@/types/evidence";

type FeePayerStatus = {
  address: string;
  balanceLamports: number;
  balanceSol: number;
  minimumLamports: number;
  funded: boolean;
};

type RegistryProgramStatus = {
  programId: string;
  deployed: boolean;
  executable: boolean;
  owner?: string;
  lamports?: number;
};

const stageLabels: Record<TraceEvent["stage"], string> = {
  production: "Thu hoạch / sản xuất",
  packing: "Sơ chế & đóng gói",
  inspection: "Kiểm định",
  logistics: "Vận chuyển / kho",
  retail: "Điểm bán",
};

function short(value?: string, left = 12, right = 8) {
  if (!value) return "—";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function errorMessage(value: string) {
  if (value === "draft_event_exists") return "Hãy xác nhận chặng draft hiện tại trước khi tạo chặng mới.";
  if (value === "invalid_event_input") return "Thông tin chặng chưa đầy đủ.";
  if (value === "event_not_draft") return "Chặng này đã được xử lý trước đó.";
  return "Không thể lưu thay đổi. Vui lòng thử lại.";
}

function solanaErrorMessage(value: string) {
  if (value.startsWith("devnet_fee_payer_needs_funding:")) {
    const address = value.split(":").at(-1);
    return `Ví fee-payer Devnet chưa có test SOL. Nạp SOL Devnet cho ${address ?? "địa chỉ fee-payer"} rồi bấm thử anchor lại.`;
  }
  return `Không thể ghi proof lên Solana Devnet: ${value}`;
}

export function BatchManagementClient({
  batch,
  feePayerStatus,
  registryProgramStatus,
}: {
  batch: ManagedProductBatch;
  feePayerStatus: FeePayerStatus | null;
  registryProgramStatus: RegistryProgramStatus | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<TraceEvent["stage"]>("production");
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [anchoringId, setAnchoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = batch.events.find((event) => event.status === "draft");
  const confirmed = batch.events.filter((event) => event.status === "confirmed");
  const anchored = confirmed.filter((event) => event.solanaProof?.status === "confirmed");
  const registryAnchored = anchored.filter(
    (event) => event.solanaProof?.kind === "check-di-registry",
  );
  const memoFallback = anchored.filter(
    (event) => event.solanaProof?.kind === "spl-memo",
  );

  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const documents = String(form.get("documents") ?? "")
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    const metrics: Record<string, number> = {};
    if (stage === "packing") {
      for (const key of ["inputWeightKg", "outputWeightKg", "declaredLossPercent"] as const) {
        const value = Number(form.get(key));
        if (Number.isFinite(value)) metrics[key] = value;
      }
    }

    const occurredAtInput = String(form.get("occurredAt") ?? "");
    const occurredAt = occurredAtInput ? new Date(occurredAtInput).toISOString() : "";

    const response = await fetch(`/api/manage/batches/${encodeURIComponent(batch.id)}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        stage,
        organizationName: form.get("organizationName"),
        location: form.get("location"),
        occurredAt,
        summary: form.get("summary"),
        documents,
        metrics,
      }),
    });

    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok) {
      setError(errorMessage(payload.error ?? "unknown_error"));
      setSaving(false);
      return;
    }

    formElement.reset();
    setSaving(false);
    router.refresh();
  }

  async function confirmEvent(eventId: string) {
    setConfirmingId(eventId);
    setError(null);

    const response = await fetch(
      `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(eventId)}/confirm`,
      { method: "POST" },
    );
    const payload = (await response.json()) as {
      ok: boolean;
      error?: string;
      solana?: {
        anchored?: boolean;
        proofKind?: "check-di-registry" | "spl-memo";
        fallback?: boolean;
        registryError?: string;
        error?: string;
      };
    };

    if (!response.ok) {
      setError(errorMessage(payload.error ?? "unknown_error"));
      setConfirmingId(null);
      return;
    }

    if (payload.solana?.anchored === false && payload.solana.error) {
      setError(`Chặng đã ký thành công. ${solanaErrorMessage(payload.solana.error)}`);
    } else if (payload.solana?.fallback) {
      setError(
        `Chặng đã ký và có SPL Memo fallback, nhưng custom Check-Di Registry chưa ghi được: ${payload.solana.registryError ?? "registry_anchor_failed"}`,
      );
    }

    setConfirmingId(null);
    router.refresh();
  }

  async function anchorEvent(eventId: string) {
    setAnchoringId(eventId);
    setError(null);

    const response = await fetch(
      `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(eventId)}/anchor`,
      { method: "POST" },
    );
    const payload = (await response.json()) as {
      ok: boolean;
      error?: string;
      solana?: {
        proofKind?: "check-di-registry" | "spl-memo";
        fallback?: boolean;
        registryError?: string;
        error?: string;
      };
    };

    if (!response.ok) {
      setError(solanaErrorMessage(payload.solana?.error ?? payload.error ?? "unknown_error"));
      setAnchoringId(null);
      router.refresh();
      return;
    }

    if (payload.solana?.fallback) {
      setError(
        `Đã có SPL Memo fallback, nhưng custom Check-Di Registry chưa ghi được: ${payload.solana.registryError ?? "registry_anchor_failed"}`,
      );
    }

    setAnchoringId(null);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-9">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="font-display text-lg font-black text-white">Check-Di</a>
          <div className="flex items-center gap-2">
            <a href="/batches/new" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">
              + Tạo lô khác
            </a>
            {confirmed.length > 0 && (
              <a
                href={`/verify/${encodeURIComponent(batch.publicId)}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
              >
                <QrCode className="size-3.5" />
                Trang QR
              </a>
            )}
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 shadow-2xl sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{batch.publicId}</p>
              <h1 className="font-display mt-2 text-2xl font-extrabold text-white sm:text-3xl">{batch.productName}</h1>
              <p className="mt-1 text-sm text-slate-400">Nguồn gốc: {batch.origin}</p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-xs ${anchored.length > 0 ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-100/80" : "border-amber-500/20 bg-amber-500/[0.06] text-amber-100/80"}`}>
              <p className={`font-bold ${registryAnchored.length > 0 ? "text-emerald-300" : "text-amber-300"}`}>Check-Di Registry · Solana Devnet</p>
              <p className="mt-1">
                {registryAnchored.length > 0
                  ? `${registryAnchored.length}/${confirmed.length} chặng có Event PDA · ${memoFallback.length} fallback`
                  : anchored.length > 0
                    ? `${anchored.length}/${confirmed.length} chặng đang dùng Memo fallback`
                    : "Chưa có chặng được ghi on-chain"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Đã xác nhận" value={`${confirmed.length}`} />
            <Stat label="Draft" value={draft ? "1" : "0"} />
            <Stat label="Hash chain" value={confirmed.length ? "Đang nối" : "Chưa bắt đầu"} />
            <Stat label="Registry PDA" value={confirmed.length ? `${registryAnchored.length}/${confirmed.length}` : "Chưa có proof"} />
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {feePayerStatus && (
              <div className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${feePayerStatus.funded ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-amber-500/15 bg-amber-500/[0.04]"}`}>
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${feePayerStatus.funded ? "text-emerald-300" : "text-amber-300"}`}>
                    Fee-payer Devnet · {feePayerStatus.funded ? "đủ phí giao dịch" : "cần nạp test SOL"}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{feePayerStatus.address}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Balance {feePayerStatus.balanceSol.toFixed(6)} SOL · cần tối thiểu {(feePayerStatus.minimumLamports / 1_000_000_000).toFixed(6)} SOL
                  </p>
                </div>
                {!feePayerStatus.funded && (
                  <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/15"
                  >
                    Mở Devnet faucet
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            )}

            {registryProgramStatus && (
              <a
                href={`https://explorer.solana.com/address/${encodeURIComponent(registryProgramStatus.programId)}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${registryProgramStatus.deployed ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-slate-700/60 bg-slate-950/35"}`}
              >
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${registryProgramStatus.deployed ? "text-emerald-300" : "text-slate-300"}`}>
                    check_di_registry · {registryProgramStatus.deployed ? "deployed" : "source ready · chưa deploy"}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{registryProgramStatus.programId}</p>
                </div>
                <ExternalLink className="size-3.5 shrink-0 text-slate-500" />
              </a>
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Hành trình</p>
                <h2 className="font-display mt-1 text-lg font-bold text-white">Các chặng của lô</h2>
              </div>
              <span className="font-mono text-[10px] text-slate-500">SHA-256 · Ed25519</span>
            </div>

            {batch.events.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                Chưa có chặng nào. Tạo chặng đầu tiên ở bên cạnh.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {batch.events.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    confirming={confirmingId === event.id}
                    anchoring={anchoringId === event.id}
                    onConfirm={() => confirmEvent(event.id)}
                    onAnchor={() => anchorEvent(event.id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6">
            {draft ? (
              <div>
                <div className="flex size-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
                  <Clock3 className="size-4" />
                </div>
                <h2 className="font-display mt-4 text-lg font-bold text-white">Có chặng đang chờ xác nhận</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Kiểm tra AI warning và dữ liệu chặng bên trái. Chỉ sau khi bấm xác nhận, Check-Di mới sinh event hash và ký bằng key của tổ chức demo.
                </p>
                <button
                  type="button"
                  onClick={() => confirmEvent(draft.id)}
                  disabled={confirmingId === draft.id}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                >
                  {confirmingId === draft.id ? <Loader2 className="size-4 animate-spin" /> : <Signature className="size-4" />}
                  {confirmingId === draft.id ? "Đang ký & ghi Registry PDA..." : "Xác nhận chặng & tạo hash"}
                </button>
              </div>
            ) : (
              <AddEventForm stage={stage} setStage={setStage} saving={saving} onSubmit={addEvent} />
            )}

            {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function AddEventForm({
  stage,
  setStage,
  saving,
  onSubmit,
}: {
  stage: TraceEvent["stage"];
  setStage: (value: TraceEvent["stage"]) => void;
  saving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
          <Plus className="size-4" />
        </div>
        <h2 className="font-display mt-4 text-lg font-bold text-white">Thêm chặng mới</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Chặng được lưu dưới dạng draft trước. Hash và chữ ký chưa sinh ở bước này.</p>
      </div>

      <label className="block text-xs font-semibold text-slate-300">
        Loại chặng
        <select
          value={stage}
          onChange={(event) => setStage(event.target.value as TraceEvent["stage"])}
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
        >
          {Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <Input label="Đơn vị xác nhận" name="organizationName" placeholder="Vườn / HTX / đơn vị kiểm định..." />
      <Input label="Địa điểm" name="location" placeholder="Krông Pắc, Đắk Lắk" />
      <Input label="Thời gian chặng" name="occurredAt" type="datetime-local" />

      <label className="block text-xs font-semibold text-slate-300">
        Nội dung chặng
        <textarea name="summary" required rows={3} placeholder="Mô tả dữ liệu mà đơn vị này chịu trách nhiệm xác nhận..." className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50" />
      </label>

      <label className="block text-xs font-semibold text-slate-300">
        Chứng từ <span className="font-normal text-slate-500">(mỗi dòng một tên)</span>
        <textarea name="documents" rows={2} placeholder="Nhật ký thu hoạch\nVietGAP #..." className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50" />
      </label>

      {stage === "packing" && (
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300"><Bot className="size-4" /> Dữ liệu cho AI đối chiếu hao hụt</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <SmallInput label="Đầu vào kg" name="inputWeightKg" />
            <SmallInput label="Đầu ra kg" name="outputWeightKg" />
            <SmallInput label="Hao hụt %" name="declaredLossPercent" />
          </div>
        </div>
      )}

      <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {saving ? "Đang lưu draft..." : "Lưu chặng dạng draft"}
      </button>
    </form>
  );
}

function EventCard({
  event,
  index,
  confirming,
  anchoring,
  onConfirm,
  onAnchor,
}: {
  event: TraceEvent;
  index: number;
  confirming: boolean;
  anchoring: boolean;
  onConfirm: () => void;
  onAnchor: () => void;
}) {
  const aiWarnings = (event.aiValidations ?? []).filter((item) => item.status !== "matched");
  const isDraft = event.status === "draft";

  return (
    <div className={`rounded-2xl border p-4 ${isDraft ? "border-amber-500/25 bg-amber-500/[0.05]" : "border-emerald-500/15 bg-emerald-500/[0.035]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-500">#{index + 1}</span>
            <h3 className="font-display truncate text-sm font-bold text-white">{stageLabels[event.stage]}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">{event.organizationName} · {event.location}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold ${isDraft ? "border-amber-500/25 bg-amber-500/10 text-amber-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"}`}>
          {isDraft ? "DRAFT · CHƯA KÝ" : "CONFIRMED · SIGNED"}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-300">{event.summary}</p>

      {(event.aiValidations ?? []).map((validation) => (
        <div key={validation.message} className={`mt-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs ${validation.status === "matched" ? "border-cyan-500/15 bg-cyan-500/[0.05] text-slate-300" : "border-amber-500/20 bg-amber-500/[0.06] text-amber-100/80"}`}>
          {validation.status === "matched" ? <Bot className="mt-0.5 size-3.5 shrink-0 text-cyan-300" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />}
          {validation.message}
        </div>
      ))}

      {event.documents && event.documents.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.documents.map((document) => (
            <span key={document} className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-slate-950/50 px-2 py-1 text-[10px] text-slate-400">
              <FileText className="size-3" /> {document}
            </span>
          ))}
        </div>
      )}

      {!isDraft && (
        <>
          <div className="mt-3 grid gap-2 font-mono text-[9px] sm:grid-cols-2">
            <Proof label="Previous" value={short(event.previousEventHash)} icon={Hash} />
            <Proof label="Event hash" value={short(event.eventHash, 14, 10)} icon={Hash} accent />
            <Proof label="Signer" value={short(event.signerPublicKey, 14, 8)} icon={ShieldCheck} />
            <Proof label="Signature" value={short(event.signature, 14, 8)} icon={Signature} />
          </div>

          {event.solanaProof?.status === "confirmed" && event.solanaProof.explorerUrl ? (
            <a
              href={event.solanaProof.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/15"
            >
              <ShieldCheck className="size-3.5" />
              {event.solanaProof.kind === "check-di-registry"
                ? `Check-Di Registry · PDA ${short(event.solanaProof.eventPda, 8, 6)}`
                : "SPL Memo · fallback proof"}
              <ExternalLink className="size-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onAnchor}
              disabled={anchoring}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-50"
            >
              {anchoring ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              {anchoring ? "Đang ghi Check-Di Registry..." : event.solanaProof?.status === "failed" ? "Thử ghi Registry lại" : "Ghi Check-Di Registry PDA"}
            </button>
          )}
        </>
      )}

      {isDraft && (
        <>
          {aiWarnings.length > 0 && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-200/75">
              AI chỉ cảnh báo. Đơn vị tại chặng vẫn có thể xác nhận và chịu trách nhiệm về dữ liệu đã ký.
            </p>
          )}
          <button onClick={onConfirm} disabled={confirming} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
            {confirming ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            {aiWarnings.length > 0 ? "Xác nhận dù có cảnh báo AI" : "Xác nhận & ký chặng"}
          </button>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/8 bg-slate-950/45 p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-white">{value}</p></div>;
}

function Input({ label, name, placeholder, type = "text" }: { label: string; name: string; placeholder?: string; type?: string }) {
  return <label className="block text-xs font-semibold text-slate-300">{label}<input name={name} type={type} placeholder={placeholder} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50" /></label>;
}

function SmallInput({ label, name }: { label: string; name: string }) {
  return <label className="text-[10px] text-slate-400">{label}<input name={name} type="number" min="0" step="0.1" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 font-mono text-xs text-white outline-none focus:border-cyan-500/50" /></label>;
}

function Proof({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: typeof Hash; accent?: boolean }) {
  return <div className="rounded-xl border border-white/5 bg-slate-950/60 p-2.5"><div className="flex items-center gap-1 text-slate-500"><Icon className="size-3" /> {label}</div><p className={`mt-1 truncate ${accent ? "text-emerald-300" : "text-slate-300"}`}>{value}</p></div>;
}
