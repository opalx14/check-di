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
import { Transaction } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ManagedProductBatch } from "@/lib/db";
import type { DocumentEvidence, TraceEvent } from "@/types/evidence";

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
  if (value === "organization_wallet_required") return "Organization chưa liên kết Phantom. Hãy liên kết ví trước khi xác nhận chặng.";
  if (value === "wallet_public_key_mismatch") return "Ví Phantom đang mở không khớp ví đã liên kết với organization.";
  if (value === "external_event_signature_invalid") return "Chữ ký Phantom không hợp lệ với eventHash hiện tại.";
  if (value === "phantom_not_available") return "Không tìm thấy Phantom trên trình duyệt này.";
  return "Không thể lưu thay đổi. Vui lòng thử lại.";
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("invalid_event_hash");
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function bytesToBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey?: { toString(): string } }>;
  signMessage(message: Uint8Array): Promise<{
    signature: Uint8Array;
    publicKey?: { toString(): string };
  }>;
  signTransaction(transaction: Transaction): Promise<Transaction>;
};

function getPhantomProvider(): PhantomProvider | null {
  const provider = (
    window as Window & {
      phantom?: { solana?: PhantomProvider };
      solana?: PhantomProvider;
    }
  ).phantom?.solana ??
    (window as Window & { solana?: PhantomProvider }).solana;
  return provider?.isPhantom ? provider : null;
}

function documentErrorMessage(value: string) {
  if (value === "unsupported_document_type") return "Chỉ nhận PDF, JPG, PNG hoặc WebP hợp lệ.";
  if (value === "document_content_type_mismatch") return "Nội dung file không khớp định dạng mà trình duyệt khai báo.";
  if (value === "document_too_large") return "Chứng từ vượt quá 10 MB.";
  if (value === "document_limit_reached") return "Mỗi chặng demo tối đa 5 chứng từ.";
  if (value === "document_hash_mismatch") return "File chứng từ off-chain đã thay đổi so với SHA-256 đã lưu. Không chạy lại demo check trên file này.";
  if (value === "event_not_draft") return "Chỉ được thêm chứng từ khi chặng còn ở trạng thái draft.";
  return `Không thể xử lý chứng từ: ${value}`;
}

function solanaErrorMessage(value: string) {
  if (value.startsWith("devnet_fee_payer_needs_funding:")) {
    const address = value.split(":").at(-1);
    return `Ví fee-payer Devnet chưa có test SOL. Nạp SOL Devnet cho ${address ?? "địa chỉ fee-payer"} rồi bấm thử anchor lại.`;
  }
  if (value === "registry_chain_head_not_ready") {
    return "Chuỗi PDA trên Devnet chưa theo kịp previousEventHash. Hãy anchor các chặng trước theo đúng thứ tự trước.";
  }
  if (value === "organization_wallet_required") {
    return "Organization chưa liên kết Phantom nên chưa thể ghi Event PDA.";
  }
  if (value === "wallet_public_key_mismatch") {
    return "Ví Phantom đang mở không khớp organization signer của chặng này.";
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
  const [lifecycleId, setLifecycleId] = useState<string | null>(null);
  const [replacementSource, setReplacementSource] = useState<TraceEvent | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [reanalyzingDocumentId, setReanalyzingDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = batch.events.find((event) => event.status === "draft");
  const finalized = batch.events.filter((event) => event.status !== "draft");
  const anchored = finalized.filter((event) => event.solanaProof?.status === "confirmed");
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
    setReplacementSource(null);
    setSaving(false);
    router.refresh();
  }

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Hãy chọn một file PDF hoặc ảnh chứng từ.");
      return;
    }

    setUploadingDocument(true);
    setError(null);

    const response = await fetch(
      `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(draft.id)}/documents`,
      { method: "POST", body: form },
    );
    const payload = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok) {
      setError(documentErrorMessage(payload.error ?? "unknown_error"));
      setUploadingDocument(false);
      return;
    }

    formElement.reset();
    setUploadingDocument(false);
    router.refresh();
  }

  async function reanalyzeDocument(documentId: string) {
    if (!draft) return;

    setReanalyzingDocumentId(documentId);
    setError(null);
    const response = await fetch(
      `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(draft.id)}/documents/${encodeURIComponent(documentId)}/reanalyze`,
      { method: "POST" },
    );
    const payload = (await response.json()) as { ok: boolean; error?: string };

    if (!response.ok) {
      setError(documentErrorMessage(payload.error ?? "unknown_error"));
      setReanalyzingDocumentId(null);
      return;
    }

    setReanalyzingDocumentId(null);
    router.refresh();
  }

  async function confirmEvent(eventId: string) {
    setConfirmingId(eventId);
    setError(null);

    try {
      const confirmUrl = `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(eventId)}/confirm`;
      const preparationResponse = await fetch(confirmUrl, { method: "GET" });
      const preparation = (await preparationResponse.json()) as {
        ok: boolean;
        error?: string;
        signingMode?: "demo" | "phantom";
        eventHash?: string;
        walletPublicKey?: string;
      };
      if (!preparationResponse.ok) {
        setError(errorMessage(preparation.error ?? "unknown_error"));
        return;
      }

      let requestInit: RequestInit = { method: "POST" };
      if (preparation.signingMode === "phantom") {
        if (!preparation.eventHash || !preparation.walletPublicKey) {
          throw new Error("organization_wallet_required");
        }
        const provider = getPhantomProvider();
        if (!provider) throw new Error("phantom_not_available");
        const connection = await provider.connect();
        const publicKey =
          connection.publicKey?.toString() ?? provider.publicKey?.toString();
        if (publicKey !== preparation.walletPublicKey) {
          throw new Error("wallet_public_key_mismatch");
        }
        const signed = await provider.signMessage(
          hexToBytes(preparation.eventHash),
        );
        requestInit = {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            signerPublicKey: publicKey,
            signatureBase64: bytesToBase64(signed.signature),
          }),
        };
      }

      const response = await fetch(confirmUrl, requestInit);
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        signingMode?: "demo" | "phantom";
        solana?: {
          anchored?: boolean;
          proofKind?: "check-di-registry" | "spl-memo";
          fallback?: boolean;
          registryError?: string;
          error?: string;
          requiresWalletTransaction?: boolean;
        };
      };

      if (!response.ok) {
        setError(errorMessage(payload.error ?? "unknown_error"));
        return;
      }

      if (payload.solana?.requiresWalletTransaction) {
        setError(
          "Chặng đã được organization ký bằng Phantom. Bước tiếp theo là ký transaction Phantom để ghi Event PDA lên Solana Devnet.",
        );
      } else if (payload.solana?.anchored === false && payload.solana.error) {
        setError(`Chặng đã ký thành công. ${solanaErrorMessage(payload.solana.error)}`);
      } else if (payload.solana?.fallback) {
        setError(
          `Chặng đã ký và có SPL Memo fallback, nhưng custom Check-Di Registry chưa ghi được: ${payload.solana.registryError ?? "registry_anchor_failed"}`,
        );
      }

      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "unknown_error";
      setError(errorMessage(message));
    } finally {
      setConfirmingId(null);
    }
  }

  async function updateEventStatus(
    eventId: string,
    status: "revoked" | "superseded",
  ) {
    const sourceEvent = batch.events.find((event) => event.id === eventId) ?? null;
    const label = status === "revoked" ? "thu hồi" : "thay thế";
    if (!window.confirm(`Xác nhận ${label} chặng này? Trạng thái này là terminal và không thể hoàn tác.`)) {
      return;
    }

    setLifecycleId(eventId);
    setError(null);
    try {
      const response = await fetch(
        `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(eventId)}/status`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok) {
        const message = payload.error ?? "unknown_error";
        if (message === "registry_proof_required_for_lifecycle") {
          setError("Chặng phải có Check-Di Registry Event PDA trước khi đổi lifecycle status.");
        } else if (message === "event_status_transition_invalid") {
          setError("Chỉ event đang confirmed mới được revoke hoặc supersede.");
        } else {
          setError(solanaErrorMessage(message));
        }
        return;
      }
      if (status === "superseded" && sourceEvent) {
        setReplacementSource(sourceEvent);
        setStage(sourceEvent.stage);
      }
      router.refresh();
    } finally {
      setLifecycleId(null);
    }
  }

  async function anchorEvent(eventId: string) {
    setAnchoringId(eventId);
    setError(null);

    try {
      const anchorUrl = `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(eventId)}/anchor`;
      const prepareResponse = await fetch(anchorUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "prepare" }),
      });
      const prepared = (await prepareResponse.json()) as {
        ok: boolean;
        error?: string;
        signingMode?: "demo" | "phantom";
        solana?: {
          anchored?: boolean;
          proofKind?: "check-di-registry" | "spl-memo";
          fallback?: boolean;
          registryError?: string;
          error?: string;
          requiresWalletTransaction?: boolean;
          transactionBase64?: string;
          walletPublicKey?: string;
        };
      };

      if (!prepareResponse.ok) {
        setError(
          solanaErrorMessage(
            prepared.solana?.error ?? prepared.error ?? "unknown_error",
          ),
        );
        return;
      }

      if (prepared.solana?.anchored) {
        router.refresh();
        return;
      }

      if (
        prepared.signingMode === "phantom" &&
        prepared.solana?.requiresWalletTransaction
      ) {
        const transactionBase64 = prepared.solana.transactionBase64;
        const walletPublicKey = prepared.solana.walletPublicKey;
        if (!transactionBase64 || !walletPublicKey) {
          throw new Error("phantom_transaction_prepare_invalid");
        }
        const provider = getPhantomProvider();
        if (!provider) throw new Error("phantom_not_available");
        const connection = await provider.connect();
        const publicKey =
          connection.publicKey?.toString() ?? provider.publicKey?.toString();
        if (publicKey !== walletPublicKey) {
          throw new Error("wallet_public_key_mismatch");
        }

        const transaction = Transaction.from(base64ToBytes(transactionBase64));
        const signed = await provider.signTransaction(transaction);
        const signedTransactionBase64 = bytesToBase64(
          signed.serialize({
            requireAllSignatures: true,
            verifySignatures: true,
          }),
        );
        const submitResponse = await fetch(anchorUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            signedTransactionBase64,
          }),
        });
        const submitted = (await submitResponse.json()) as {
          ok: boolean;
          error?: string;
          solana?: { error?: string };
        };
        if (!submitResponse.ok) {
          setError(
            solanaErrorMessage(
              submitted.solana?.error ?? submitted.error ?? "unknown_error",
            ),
          );
          return;
        }
        router.refresh();
        return;
      }

      if (prepared.solana?.fallback) {
        setError(
          `Đã có SPL Memo fallback, nhưng custom Check-Di Registry chưa ghi được: ${prepared.solana.registryError ?? "registry_anchor_failed"}`,
        );
      }
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "unknown_error";
      setError(
        message === "phantom_not_available" ||
        message === "wallet_public_key_mismatch"
          ? errorMessage(message)
          : solanaErrorMessage(message),
      );
    } finally {
      setAnchoringId(null);
    }
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
            {finalized.length > 0 && (
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
                  ? `${registryAnchored.length}/${finalized.length} chặng có Event PDA · ${memoFallback.length} fallback`
                  : anchored.length > 0
                    ? `${anchored.length}/${finalized.length} chặng đang dùng Memo fallback`
                    : "Chưa có chặng được ghi on-chain"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Đã ký / terminal" value={`${finalized.length}`} />
            <Stat label="Draft" value={draft ? "1" : "0"} />
            <Stat label="Hash chain" value={finalized.length ? "Đang nối" : "Chưa bắt đầu"} />
            <Stat label="Registry PDA" value={finalized.length ? `${registryAnchored.length}/${finalized.length}` : "Chưa có proof"} />
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
                    lifecycleChanging={lifecycleId === event.id}
                    onConfirm={() => confirmEvent(event.id)}
                    onAnchor={() => anchorEvent(event.id)}
                    onLifecycle={(status) => updateEventStatus(event.id, status)}
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
                  Kiểm tra AI warning và dữ liệu chặng bên trái. Khi xác nhận, Check-Di sinh canonical event hash; organization đã đăng nhập sẽ ký bằng Phantom, còn legacy demo dùng signer fallback.
                </p>
                <DocumentUploadPanel
                  event={draft}
                  uploading={uploadingDocument}
                  reanalyzingDocumentId={reanalyzingDocumentId}
                  onSubmit={uploadDocument}
                  onReanalyze={reanalyzeDocument}
                />
                <button
                  type="button"
                  onClick={() => confirmEvent(draft.id)}
                  disabled={confirmingId === draft.id}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                >
                  {confirmingId === draft.id ? <Loader2 className="size-4 animate-spin" /> : <Signature className="size-4" />}
                  {confirmingId === draft.id ? "Đang ký chặng..." : "Xác nhận chặng & tạo hash"}
                </button>
              </div>
            ) : (
              <AddEventForm
                stage={stage}
                setStage={setStage}
                saving={saving}
                replacementSource={replacementSource}
                onCancelReplacement={() => setReplacementSource(null)}
                onSubmit={addEvent}
              />
            )}

            {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function DocumentUploadPanel({
  event,
  uploading,
  reanalyzingDocumentId,
  onSubmit,
  onReanalyze,
}: {
  event: TraceEvent;
  uploading: boolean;
  reanalyzingDocumentId: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReanalyze: (documentId: string) => void;
}) {
  const evidence = event.documentEvidence ?? [];

  return (
    <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
      <div className="flex items-start gap-2">
        <Bot className="mt-0.5 size-4 shrink-0 text-cyan-300" />
        <div>
          <p className="text-xs font-bold text-cyan-300">Chứng từ thật + AI demo check</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            PDF/ảnh được giữ off-chain và tính SHA-256 thật. Phần extraction là mô phỏng deterministic từ tên file/metadata để demo flow, không cần API key. Tối đa 5 file, 10 MB/file.
          </p>
        </div>
      </div>

      {evidence.length > 0 && (
        <div className="mt-3 space-y-2">
          {evidence.map((document) => (
            <DocumentEvidenceCard
              key={document.id}
              evidence={document}
              reanalyzing={reanalyzingDocumentId === document.id}
              onReanalyze={() => onReanalyze(document.id)}
            />
          ))}
        </div>
      )}

      <p className="mt-3 rounded-xl border border-white/8 bg-slate-950/40 p-2.5 text-[10px] leading-relaxed text-slate-500">
        Demo dễ thấy cross-check: đặt tên file kiểu <span className="font-mono text-cyan-300">DUR-260830-01_HTX-Dak-Farm_1080kg_PK-0830.pdf</span>.
      </p>

      <form onSubmit={onSubmit} className="mt-3 space-y-2">
        <input
          type="file"
          name="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp"
          disabled={uploading || evidence.length >= 5}
          className="block w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-2.5 file:py-1.5 file:text-[11px] file:font-bold file:text-cyan-300 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={uploading || evidence.length >= 5}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
          {uploading ? "Đang lưu file & chạy demo check..." : "Tải chứng từ & chạy AI demo"}
        </button>
      </form>
    </div>
  );
}

function DocumentEvidenceCard({
  evidence,
  reanalyzing = false,
  onReanalyze,
}: {
  evidence: DocumentEvidence;
  reanalyzing?: boolean;
  onReanalyze?: () => void;
}) {
  const extraction = evidence.extraction;
  const statusClass = "text-cyan-300";
  const extracted = [
    extraction.documentType,
    extraction.documentNumber,
    extraction.batchId ? `Lô ${extraction.batchId}` : undefined,
    extraction.quantity !== undefined
      ? `${extraction.quantity}${extraction.unit ? ` ${extraction.unit}` : ""}`
      : undefined,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/55 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-200">{evidence.filename}</p>
          <p className="mt-1 font-mono text-[9px] text-slate-600">
            SHA-256 {short(evidence.sha256, 10, 8)} · {(evidence.sizeBytes / 1024).toFixed(1)} KB
          </p>
        </div>
        <span className={`shrink-0 text-[9px] font-bold ${statusClass}`}>
          DEMO EXTRACTION
        </span>
      </div>
      {extracted.length > 0 && (
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{extracted.join(" · ")}</p>
      )}
      <p className="mt-1 text-[9px] text-slate-600">
        {extraction.provider} · {extraction.model} · simulated
        {extraction.confidence !== undefined ? ` · confidence ${(extraction.confidence * 100).toFixed(0)}%` : ""}
      </p>
      {onReanalyze && (
        <button
          type="button"
          onClick={onReanalyze}
          disabled={reanalyzing}
          className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
        >
          {reanalyzing && <Loader2 className="size-3 animate-spin" />}
          {reanalyzing ? "Đang chạy demo lại..." : "Chạy demo check lại"}
        </button>
      )}
    </div>
  );
}

function AddEventForm({
  stage,
  setStage,
  saving,
  replacementSource,
  onCancelReplacement,
  onSubmit,
}: {
  stage: TraceEvent["stage"];
  setStage: (value: TraceEvent["stage"]) => void;
  saving: boolean;
  replacementSource: TraceEvent | null;
  onCancelReplacement: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
          <Plus className="size-4" />
        </div>
        <h2 className="font-display mt-4 text-lg font-bold text-white">
          {replacementSource ? "Tạo bản thay thế" : "Thêm chặng mới"}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Chặng được lưu dưới dạng draft trước. Hash và chữ ký chưa sinh ở bước này.
        </p>
        {replacementSource && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] leading-relaxed text-amber-100/80">
            Đang tạo bản thay thế cho event <span className="font-mono text-amber-300">{short(replacementSource.eventHash, 12, 8)}</span>. Bản cũ vẫn giữ nguyên trong lịch sử; event mới sẽ nối tiếp hash của bản đã supersede.
            <button
              type="button"
              onClick={onCancelReplacement}
              className="ml-2 font-bold text-amber-300 hover:text-amber-200"
            >
              Hủy chế độ thay thế
            </button>
          </div>
        )}
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

      <Input
        label="Đơn vị xác nhận"
        name="organizationName"
        placeholder="Vườn / HTX / đơn vị kiểm định..."
        defaultValue={replacementSource?.organizationName}
      />
      <Input
        label="Địa điểm"
        name="location"
        placeholder="Krông Pắc, Đắk Lắk"
        defaultValue={replacementSource?.location}
      />
      <Input label="Thời gian chặng" name="occurredAt" type="datetime-local" />

      <label className="block text-xs font-semibold text-slate-300">
        Nội dung chặng
        <textarea
          name="summary"
          required
          rows={3}
          defaultValue={replacementSource ? `Bản thay thế: ${replacementSource.summary}` : undefined}
          placeholder="Mô tả dữ liệu mà đơn vị này chịu trách nhiệm xác nhận..."
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
        />
      </label>

      <label className="block text-xs font-semibold text-slate-300">
        Tham chiếu chứng từ thủ công <span className="font-normal text-slate-500">(tùy chọn)</span>
        <textarea name="documents" rows={2} placeholder="Số biên bản / tên chứng từ nếu chưa có file..." className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50" />
        <span className="mt-1.5 block text-[10px] font-normal text-slate-600">Sau khi lưu draft, bạn có thể tải PDF/ảnh thật để chạy extraction demo và đối chiếu.</span>
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
        {saving
          ? "Đang lưu draft..."
          : replacementSource
            ? "Lưu bản thay thế dạng draft"
            : "Lưu chặng dạng draft"}
      </button>
    </form>
  );
}

function EventCard({
  event,
  index,
  confirming,
  anchoring,
  lifecycleChanging,
  onConfirm,
  onAnchor,
  onLifecycle,
}: {
  event: TraceEvent;
  index: number;
  confirming: boolean;
  anchoring: boolean;
  lifecycleChanging: boolean;
  onConfirm: () => void;
  onAnchor: () => void;
  onLifecycle: (status: "revoked" | "superseded") => void;
}) {
  const aiWarnings = (event.aiValidations ?? []).filter((item) => item.status !== "matched");
  const isDraft = event.status === "draft";
  const isRevoked = event.status === "revoked";
  const isSuperseded = event.status === "superseded";
  const isTerminal = isRevoked || isSuperseded;
  const evidenceFilenames = new Set((event.documentEvidence ?? []).map((item) => item.filename));
  const manualDocuments = (event.documents ?? []).filter((item) => !evidenceFilenames.has(item));

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
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold ${isDraft ? "border-amber-500/25 bg-amber-500/10 text-amber-300" : isTerminal ? "border-red-500/25 bg-red-500/10 text-red-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"}`}>
          {isDraft
            ? "DRAFT · CHƯA KÝ"
            : isRevoked
              ? "REVOKED · TERMINAL"
              : isSuperseded
                ? "SUPERSEDED · TERMINAL"
                : "CONFIRMED · SIGNED"}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-300">{event.summary}</p>

      {(event.aiValidations ?? []).map((validation) => (
        <div key={validation.message} className={`mt-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs ${validation.status === "matched" ? "border-cyan-500/15 bg-cyan-500/[0.05] text-slate-300" : "border-amber-500/20 bg-amber-500/[0.06] text-amber-100/80"}`}>
          {validation.status === "matched" ? <Bot className="mt-0.5 size-3.5 shrink-0 text-cyan-300" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />}
          {validation.message}
        </div>
      ))}

      {event.documentEvidence && event.documentEvidence.length > 0 && (
        <div className="mt-3 space-y-2">
          {event.documentEvidence.map((document) => (
            <DocumentEvidenceCard key={document.id} evidence={document} />
          ))}
        </div>
      )}

      {manualDocuments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {manualDocuments.map((document) => (
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
          ) : event.status === "confirmed" ? (
            <button
              type="button"
              onClick={onAnchor}
              disabled={anchoring}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-50"
            >
              {anchoring ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              {anchoring ? "Đang ghi Check-Di Registry..." : event.solanaProof?.status === "failed" ? "Thử ghi Registry lại" : "Ghi Check-Di Registry PDA"}
            </button>
          ) : null}

          {event.status === "confirmed" &&
            event.solanaProof?.status === "confirmed" &&
            event.solanaProof.kind === "check-di-registry" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onLifecycle("revoked")}
                  disabled={lifecycleChanging}
                  className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[10px] font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {lifecycleChanging ? "Đang cập nhật..." : "Revoke event"}
                </button>
                <button
                  type="button"
                  onClick={() => onLifecycle("superseded")}
                  disabled={lifecycleChanging}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[10px] font-bold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  {lifecycleChanging ? "Đang cập nhật..." : "Supersede event"}
                </button>
              </div>
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

function Input({
  label,
  name,
  placeholder,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-300">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
      />
    </label>
  );
}

function SmallInput({ label, name }: { label: string; name: string }) {
  return <label className="text-[10px] text-slate-400">{label}<input name={name} type="number" min="0" step="0.1" required className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 font-mono text-xs text-white outline-none focus:border-cyan-500/50" /></label>;
}

function Proof({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: typeof Hash; accent?: boolean }) {
  return <div className="rounded-xl border border-white/5 bg-slate-950/60 p-2.5"><div className="flex items-center gap-1 text-slate-500"><Icon className="size-3" /> {label}</div><p className={`mt-1 truncate ${accent ? "text-emerald-300" : "text-slate-300"}`}>{value}</p></div>;
}
