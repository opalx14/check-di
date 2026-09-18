"use client";

import {
  AlertTriangle,
  Bot,
  Camera,
  Check,
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
  Trash2,
} from "lucide-react";
import { Transaction } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TourGuide, type TourStep } from "@/components/TourGuide";
import type { ManagedProductBatch } from "@/lib/db";
import { productVisualForName } from "@/lib/product-visuals";
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

type ConfirmProgressModal = {
  open: boolean;
  step: 1 | 2;
  stepStatus:
    | "idle"
    | "preparing_hash"
    | "waiting_signature"
    | "signature_verified"
    | "preparing_tx"
    | "waiting_tx"
    | "sending_tx"
    | "confirmed"
    | "failed";
  stageLabel?: string;
  txSignature?: string;
  eventPda?: string;
  error?: string;
};

const stageLabels: Record<TraceEvent["stage"], string> = {
  production: "Thu hoạch / sản xuất",
  packing: "Sơ chế & đóng gói",
  inspection: "Kiểm định",
  logistics: "Vận chuyển / kho",
  retail: "Điểm bán",
};

function buildBatchManageTourSteps(publicId: string): TourStep[] {
  return [
    {
      target: '[data-tour="batch-management-header"]',
      title: "Tổng quan lô hàng & Mạng Devnet",
      description: "Mã lô công khai, ảnh sản phẩm, số chặng đã xác nhận và trạng thái chương trình Anchor check_di_registry trên Solana Devnet.",
    },
    {
      target: '[data-tour="batch-journey-stages"]',
      title: "5 chặng hành trình",
      description: "Chuỗi cung ứng gồm 5 chặng: Thu hoạch/sản xuất → Đóng gói → Kiểm định → Vận chuyển → Điểm bán. Mỗi chặng liên kết bằng SHA-256 eventHash.",
    },
    {
      target: '[data-tour="batch-photo-capture"]',
      title: "Chụp ảnh sản phẩm thật tại nguồn",
      description: "Ở chặng đầu, bắt buộc chụp hoặc tải ảnh nông sản thật. Khi còn bản nháp có thể chụp lại hoặc xóa; sau khi ký Phantom, SHA-256 ảnh được khóa vào lịch sử.",
    },
    {
      target: '[data-tour="batch-documents-section"]',
      title: "Chứng từ số & AI Demo Check",
      description: "Đính kèm chứng từ (PDF/ảnh). AI demo check tự động đối chiếu số lượng, mã lô, ngày tháng và cảnh báo bất thường trước khi ký.",
    },
    {
      target: '[data-tour="batch-confirm-action"]',
      title: "Ký Phantom & Ghi nhận Solana Devnet",
      description: "Tổ chức dùng Phantom ký canonical eventHash, sau đó ký Registry transaction để tạo Event PDA và nhận TXID thật trên Solana Explorer.",
    },
    {
      target: '[data-tour="batch-solana-pda"]',
      title: "Minh chứng On-Chain & Explorer",
      description: "Các chặng đã xác nhận hiển thị Event PDA, organization signer, TXID và liên kết mở trực tiếp trên Solana Explorer.",
    },
    {
      target: '[data-tour="batch-lifecycle-section"]',
      title: "Quản lý vòng đời (Revoke / Supersede)",
      description: "Khi cần hiệu chỉnh, thực hiện chuyển trạng thái on-chain. Lịch sử cũ được bảo toàn trong audit chain, sự kiện mới nối tiếp hash của chặng trước.",
      actionLabel: "Xem trang QR người mua →",
      actionHref: `/verify/${encodeURIComponent(publicId)}`,
    },
  ];
}

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
  if (value === "product_photo_required") return "Hãy chụp hoặc tải ảnh sản phẩm thật trước khi ký chặng đầu tiên.";
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
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);
  const [confirmProgress, setConfirmProgress] = useState<ConfirmProgressModal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = batch.events.find((event) => event.status === "draft");
  const draftHasProductPhoto = Boolean(
    draft?.documentEvidence?.some((document) => document.mimeType.startsWith("image/")),
  );
  const finalized = batch.events.filter((event) => event.status !== "draft");
  const anchored = finalized.filter((event) => event.solanaProof?.status === "confirmed");
  const registryAnchored = anchored.filter(
    (event) => event.solanaProof?.kind === "check-di-registry",
  );
  const memoFallback = anchored.filter(
    (event) => event.solanaProof?.kind === "spl-memo",
  );
  const signedProductPhoto = finalized.some((event) =>
    event.documentEvidence?.some((document) => document.mimeType.startsWith("image/")),
  );

  async function createSourceDraft() {
    setSaving(true);
    setError(null);
    const response = await fetch(
      `/api/manage/batches/${encodeURIComponent(batch.id)}/events`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage: "production",
          organizationName: "Nhà sản xuất",
          location: batch.origin,
          occurredAt: new Date().toISOString(),
          summary: `Ghi nhận ảnh ${batch.productName} tại nguồn.`,
          documents: [],
          metrics: {},
        }),
      },
    );
    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok) {
      setError(errorMessage(payload.error ?? "unknown_error"));
      setSaving(false);
      return;
    }
    setStage("production");
    setSaving(false);
    router.refresh();
  }

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

  async function removeDocument(documentId: string) {
    if (!draft) return;
    if (!window.confirm("Bỏ ảnh/file nháp này để chụp hoặc chọn lại?")) return;

    setRemovingDocumentId(documentId);
    setError(null);
    const response = await fetch(
      `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(draft.id)}/documents/${encodeURIComponent(documentId)}`,
      { method: "DELETE" },
    );
    const payload = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok) {
      setError(documentErrorMessage(payload.error ?? "unknown_error"));
      setRemovingDocumentId(null);
      return;
    }

    setRemovingDocumentId(null);
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
    const targetEvent = batch.events.find((event) => event.id === eventId);
    if (
      targetEvent?.stage === "production" &&
      !window.confirm(
        "Ký chặng nguồn ngay? Sau khi Phantom ký, SHA-256 ảnh nằm trong event hash và bản ghi này không thể sửa hoặc xóa. Nếu ảnh chưa đúng, hãy bấm Hủy và chụp lại trước.",
      )
    ) {
      return;
    }

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

        setConfirmProgress({
          open: true,
          step: 1,
          stepStatus: "waiting_signature",
          stageLabel: stageLabels[draft?.stage ?? "production"],
        });

        const connection = await provider.connect();
        const publicKey =
          connection.publicKey?.toString() ?? provider.publicKey?.toString();
        if (publicKey !== preparation.walletPublicKey) {
          throw new Error("wallet_public_key_mismatch");
        }

        const signed = await provider.signMessage(
          new TextEncoder().encode(preparation.eventHash),
        );

        setConfirmProgress((prev) =>
          prev ? { ...prev, stepStatus: "signature_verified" } : null,
        );

        requestInit = {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            signerPublicKey: publicKey,
            signatureBase64: bytesToBase64(signed.signature),
          }),
        };

        const response = await fetch(confirmUrl, requestInit);
        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          signingMode?: "demo" | "phantom";
          event?: TraceEvent;
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
          throw new Error(payload.error ?? "unknown_error");
        }

        if (payload.solana?.requiresWalletTransaction) {
          setConfirmProgress((prev) =>
            prev ? { ...prev, step: 2, stepStatus: "preparing_tx" } : null,
          );

          const anchorUrl = `/api/manage/batches/${encodeURIComponent(batch.id)}/events/${encodeURIComponent(eventId)}/anchor`;
          const prepareResponse = await fetch(anchorUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "prepare" }),
          });
          const prepared = await prepareResponse.json();
          if (!prepareResponse.ok) {
            throw new Error(
              prepared.solana?.error ?? prepared.error ?? "registry_prepare_failed",
            );
          }

          if (prepared.solana?.anchored) {
            setConfirmProgress({
              open: true,
              step: 2,
              stepStatus: "confirmed",
              txSignature: prepared.solana?.transactionSignature,
              eventPda: prepared.event?.solanaProof?.eventPda,
            });
            router.refresh();
            return;
          }

          const transactionBase64 = prepared.solana?.transactionBase64;
          const walletPublicKey = prepared.solana?.walletPublicKey;
          if (!transactionBase64 || !walletPublicKey) {
            throw new Error("phantom_transaction_prepare_invalid");
          }

          setConfirmProgress((prev) =>
            prev ? { ...prev, stepStatus: "waiting_tx" } : null,
          );

          const transaction = Transaction.from(base64ToBytes(transactionBase64));
          const signedTx = await provider.signTransaction(transaction);
          const signedTransactionBase64 = bytesToBase64(
            signedTx.serialize({
              requireAllSignatures: true,
              verifySignatures: true,
            }),
          );

          setConfirmProgress((prev) =>
            prev ? { ...prev, stepStatus: "sending_tx" } : null,
          );

          const submitResponse = await fetch(anchorUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "submit",
              signedTransactionBase64,
            }),
          });
          const submitted = await submitResponse.json();
          if (!submitResponse.ok) {
            throw new Error(
              submitted.solana?.error ?? submitted.error ?? "registry_submit_failed",
            );
          }

          setConfirmProgress({
            open: true,
            step: 2,
            stepStatus: "confirmed",
            txSignature: submitted.solana?.transactionSignature,
            eventPda: submitted.event?.solanaProof?.eventPda,
          });
          router.refresh();
          return;
        }

        router.refresh();
        return;
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

      if (payload.solana?.anchored === false && payload.solana.error) {
        setError(`Chặng đã ký thành công. ${solanaErrorMessage(payload.solana.error)}`);
      } else if (payload.solana?.fallback) {
        setError(
          `Chặng đã ký và có SPL Memo fallback, nhưng custom Check-Di Registry chưa ghi được: ${payload.solana.registryError ?? "registry_anchor_failed"}`,
        );
      }

      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "unknown_error";
      const resolvedError =
        message === "phantom_not_available" ||
        message === "wallet_public_key_mismatch"
          ? errorMessage(message)
          : solanaErrorMessage(message);

      setConfirmProgress((prev) =>
        prev
          ? {
              ...prev,
              stepStatus: "failed",
              error: resolvedError,
            }
          : null,
      );
      setError(resolvedError);
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

        setConfirmProgress({
          open: true,
          step: 2,
          stepStatus: "waiting_tx",
        });

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

        setConfirmProgress((prev) =>
          prev ? { ...prev, stepStatus: "sending_tx" } : null,
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
          solana?: {
            error?: string;
            transactionSignature?: string;
          };
          event?: TraceEvent;
        };
        if (!submitResponse.ok) {
          throw new Error(
            submitted.solana?.error ?? submitted.error ?? "unknown_error",
          );
        }

        setConfirmProgress({
          open: true,
          step: 2,
          stepStatus: "confirmed",
          txSignature: submitted.solana?.transactionSignature,
          eventPda: submitted.event?.solanaProof?.eventPda,
        });
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
      const resolvedError =
        message === "phantom_not_available" ||
        message === "wallet_public_key_mismatch"
          ? errorMessage(message)
          : solanaErrorMessage(message);

      setConfirmProgress((prev) =>
        prev
          ? {
              ...prev,
              stepStatus: "failed",
              error: resolvedError,
            }
          : null,
      );
      setError(resolvedError);
    } finally {
      setAnchoringId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-6 text-slate-100 sm:px-6 sm:py-9">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <a href="/supplier" className="font-display text-lg font-black text-white">← Kho sản phẩm</a>
          <div className="flex items-center gap-2">
            <a href="/batches/new" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">
              + Sản phẩm
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

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 shadow-2xl sm:p-7" data-tour="batch-management-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={
                  signedProductPhoto
                    ? `/api/batches/${encodeURIComponent(batch.publicId)}/photo`
                    : productVisualForName(batch.productName).imageUrl
                }
                alt={batch.productName}
                className="size-16 rounded-2xl border border-white/10 object-cover sm:size-20"
              />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">{batch.publicId}</p>
                <h1 className="font-display mt-1 text-2xl font-extrabold text-white sm:text-3xl">{batch.productName}</h1>
                <p className="mt-1 text-sm text-slate-400">{batch.origin}</p>
              </div>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-xs ${anchored.length > 0 ? "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-100/80" : "border-amber-500/20 bg-amber-500/[0.06] text-amber-100/80"}`}>
              <p className={`font-bold ${registryAnchored.length > 0 ? "text-emerald-300" : "text-amber-300"}`}>Integrity proof</p>
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
            <Stat label="Đã xác nhận" value={`${finalized.length}`} />
            <Stat label="Bản nháp" value={draft ? "1" : "0"} />
            <Stat label="Chuỗi hash" value={finalized.length ? "Đang nối" : "Chưa có"} />
            <Stat label="Devnet proof" value={finalized.length ? `${registryAnchored.length}/${finalized.length}` : "0"} />
          </div>

          {(feePayerStatus || registryProgramStatus) && (
            <details className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02]">
              <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-slate-400 hover:text-white">
                Thông tin kỹ thuật Devnet
              </summary>
              <div className="grid gap-2 border-t border-white/8 p-3 lg:grid-cols-2">
                {feePayerStatus && (
                  <div className={`rounded-xl border p-3 ${feePayerStatus.funded ? "border-emerald-500/15 bg-emerald-500/[0.04]" : "border-amber-500/15 bg-amber-500/[0.04]"}`}>
                    <p className={`text-xs font-bold ${feePayerStatus.funded ? "text-emerald-300" : "text-amber-300"}`}>
                      Fee payer · {feePayerStatus.funded ? "sẵn sàng" : "cần test SOL"}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{feePayerStatus.address}</p>
                  </div>
                )}
                {registryProgramStatus && (
                  <a
                    href={`https://explorer.solana.com/address/${encodeURIComponent(registryProgramStatus.programId)}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-300">Registry · {registryProgramStatus.deployed ? "deployed" : "pending"}</p>
                      <p className="mt-1 truncate font-mono text-[10px] text-slate-500">{registryProgramStatus.programId}</p>
                    </div>
                    <ExternalLink className="size-3.5 shrink-0 text-slate-500" />
                  </a>
                )}
              </div>
            </details>
          )}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6" data-tour="batch-journey-stages">
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

          <section className="rounded-3xl border border-white/10 bg-[#0b111c]/95 p-5 sm:p-6" data-tour="batch-photo-capture">
            {draft ? (
              <div>
                <div className="flex size-10 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-300">
                  <Clock3 className="size-4" />
                </div>
                <h2 className="font-display mt-4 text-lg font-bold text-white">Chặng đang chờ ký</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Kiểm tra chứng từ và cảnh báo trước khi ký.
                </p>
                <div data-tour="batch-documents-section">
                  <DocumentUploadPanel
                    event={draft}
                    uploading={uploadingDocument}
                    reanalyzingDocumentId={reanalyzingDocumentId}
                    removingDocumentId={removingDocumentId}
                    onSubmit={uploadDocument}
                    onReanalyze={reanalyzeDocument}
                    onRemove={removeDocument}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => confirmEvent(draft.id)}
                  data-tour="batch-confirm-action"
                  disabled={
                    confirmingId === draft.id ||
                    (draft.stage === "production" && !draftHasProductPhoto)
                  }
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {confirmingId === draft.id ? <Loader2 className="size-4 animate-spin" /> : <Signature className="size-4" />}
                  {confirmingId === draft.id
                    ? "Đang ký & ghi Devnet..."
                    : draft.stage === "production"
                      ? draftHasProductPhoto
                        ? "Ký ảnh + chặng & ghi Devnet"
                        : "Chụp ảnh trước khi ký"
                      : "Xác nhận chặng & tạo hash"}
                </button>
              </div>
            ) : batch.events.length === 0 ? (
              <div>
                <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                  <Camera className="size-4" />
                </div>
                <h2 className="font-display mt-4 text-lg font-bold text-white">Chụp sản phẩm đầu tiên</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Tạo chặng nguồn trước, sau đó chụp ảnh bằng điện thoại và xem lại trước khi ký.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><span className="font-bold text-cyan-300">1</span><br />Chụp & xem lại</div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><span className="font-bold text-violet-300">2</span><br />Phantom ký</div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3"><span className="font-bold text-emerald-300">3</span><br />Devnet TXID</div>
                </div>
                <button
                  type="button"
                  onClick={createSourceDraft}
                  disabled={saving}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  {saving ? "Đang tạo chặng nguồn..." : "Bắt đầu chụp sản phẩm"}
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

      {confirmProgress && (
        <ConfirmProgressModalView
          progress={confirmProgress}
          onClose={() => {
            setConfirmProgress(null);
            router.refresh();
          }}
        />
      )}

      <TourGuide
        tourKey="supplier_batch_manage"
        flowTitle="Hướng dẫn quản lý lô"
        role="supplier"
        steps={buildBatchManageTourSteps(batch.publicId)}
      />
    </main>
  );
}

function DocumentUploadPanel({
  event,
  uploading,
  reanalyzingDocumentId,
  removingDocumentId,
  onSubmit,
  onReanalyze,
  onRemove,
}: {
  event: TraceEvent;
  uploading: boolean;
  reanalyzingDocumentId: string | null;
  removingDocumentId: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReanalyze: (documentId: string) => void;
  onRemove: (documentId: string) => void;
}) {
  const evidence = event.documentEvidence ?? [];
  const isProductCapture = event.stage === "production";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (evidence.length > 0 && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [evidence.length, previewUrl]);

  return (
    <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
      <div className="flex items-start gap-2">
        {isProductCapture ? (
          <Camera className="mt-0.5 size-4 shrink-0 text-cyan-300" />
        ) : (
          <Bot className="mt-0.5 size-4 shrink-0 text-cyan-300" />
        )}
        <div>
          <p className="text-xs font-bold text-cyan-300">
            {isProductCapture ? "Ảnh sản phẩm tại nguồn" : "Chứng từ + AI demo check"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {isProductCapture
              ? "Chụp trực tiếp bằng điện thoại hoặc chọn ảnh thật. Ảnh được SHA-256 và đi vào payload trước khi Phantom ký."
              : "PDF/ảnh giữ off-chain, SHA-256 thật; extraction hiện là demo deterministic."}
          </p>
        </div>
      </div>

      {isProductCapture && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] p-3 text-[10px] leading-relaxed text-emerald-100/80">
            <span className="font-bold text-emerald-300">CHƯA KÝ:</span> có thể bỏ ảnh và chụp lại.
          </div>
          <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.05] p-3 text-[10px] leading-relaxed text-violet-100/80">
            <span className="font-bold text-violet-300">ĐÃ KÝ:</span> ảnh/hash trở thành lịch sử, không sửa hoặc xóa.
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
          <img src={previewUrl} alt="Ảnh vừa chụp" className="h-48 w-full object-cover" />
          <p className="px-3 py-2 text-[10px] text-slate-500">Preview trên máy · chưa upload · chưa ký</p>
        </div>
      )}

      {evidence.length > 0 && (
        <div className="mt-3 space-y-2">
          {evidence.map((document) => (
            <DocumentEvidenceCard
              key={document.id}
              evidence={document}
              reanalyzing={reanalyzingDocumentId === document.id}
              removing={removingDocumentId === document.id}
              onReanalyze={() => onReanalyze(document.id)}
              onRemove={() => onRemove(document.id)}
            />
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-3 space-y-2">
        <input
          type="file"
          name="file"
          required
          accept={isProductCapture ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp"}
          capture={isProductCapture ? "environment" : undefined}
          disabled={uploading || evidence.length >= 5}
          onChange={(changeEvent) => {
            const file = changeEvent.currentTarget.files?.[0];
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(file?.type.startsWith("image/") ? URL.createObjectURL(file) : null);
          }}
          className="block w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-2.5 file:py-1.5 file:text-[11px] file:font-bold file:text-cyan-300 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={uploading || evidence.length >= 5}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : isProductCapture ? <Camera className="size-3.5" /> : <FileText className="size-3.5" />}
          {uploading
            ? "Đang lưu & tạo SHA-256..."
            : isProductCapture
              ? "Lưu ảnh nháp (chưa ký)"
              : "Tải chứng từ"}
        </button>
      </form>
    </div>
  );
}

function DocumentEvidenceCard({
  evidence,
  reanalyzing = false,
  removing = false,
  onReanalyze,
  onRemove,
}: {
  evidence: DocumentEvidence;
  reanalyzing?: boolean;
  removing?: boolean;
  onReanalyze?: () => void;
  onRemove?: () => void;
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
      {(onReanalyze || onRemove) && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {onReanalyze && (
            <button
              type="button"
              onClick={onReanalyze}
              disabled={reanalyzing || removing}
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
            >
              {reanalyzing && <Loader2 className="size-3 animate-spin" />}
              {reanalyzing ? "Đang kiểm tra..." : "Kiểm tra lại"}
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={removing || reanalyzing}
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-50"
            >
              {removing ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              {removing ? "Đang bỏ..." : "Bỏ ảnh/file & chụp lại"}
            </button>
          )}
        </div>
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
              data-tour="batch-solana-pda"
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
              data-tour="batch-solana-pda"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15 disabled:opacity-50"
            >
              {anchoring ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
              {anchoring ? "Đang ghi Check-Di Registry..." : event.solanaProof?.status === "failed" ? "Thử ghi Registry lại" : "Ghi Check-Di Registry PDA"}
            </button>
          ) : null}

          {event.status === "confirmed" &&
            event.solanaProof?.status === "confirmed" &&
            event.solanaProof.kind === "check-di-registry" && (
              <div className="mt-2 grid grid-cols-2 gap-2" data-tour="batch-lifecycle-section">
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

function ConfirmProgressModalView({
  progress,
  onClose,
}: {
  progress: ConfirmProgressModal;
  onClose: () => void;
}) {
  if (!progress.open) return null;

  const isStep1Done =
    progress.step === 2 ||
    progress.stepStatus === "signature_verified" ||
    progress.stepStatus === "confirmed";
  const isStep2Done = progress.stepStatus === "confirmed";
  const isFailed = progress.stepStatus === "failed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b111c] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white">Xác nhận chặng & Solana Devnet</h3>
              <p className="text-[11px] font-mono text-slate-400">Phantom dual-signer pipeline</p>
            </div>
          </div>
          <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-violet-300">
            SOLANA DEVNET
          </span>
        </div>

        {/* Stepper */}
        <div className="mt-5 space-y-4">
          {/* Step 1 */}
          <div
            className={`rounded-2xl border p-4 transition ${
              isStep1Done
                ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                : progress.step === 1
                  ? "border-violet-500/30 bg-violet-500/[0.04]"
                  : "border-white/5 bg-slate-950/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                    isStep1Done
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-violet-500 text-white"
                  }`}
                >
                  {isStep1Done ? <Check className="size-3.5" /> : "1"}
                </span>
                <span className="font-display text-xs font-bold text-white">
                  Sign event integrity
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Ed25519 hash</span>
            </div>

            <div className="mt-3 pl-8 text-xs text-slate-300">
              {progress.step === 1 && !isStep1Done && (
                <div className="flex items-center gap-2 text-violet-300">
                  <Loader2 className="size-3.5 animate-spin" />
                  {progress.stepStatus === "waiting_signature"
                    ? "Chờ Phantom ký xác nhận event hash..."
                    : "Đang chuẩn bị canonical event hash..."}
                </div>
              )}
              {isStep1Done && (
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="size-3.5" />
                  <span>Chữ ký organization đã xác minh trên server</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div
            className={`rounded-2xl border p-4 transition ${
              isStep2Done
                ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                : progress.step === 2 && !isFailed
                  ? "border-violet-500/30 bg-violet-500/[0.04]"
                  : "border-white/5 bg-slate-950/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                    isStep2Done
                      ? "bg-emerald-500 text-slate-950"
                      : progress.step === 2
                        ? "bg-violet-500 text-white"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isStep2Done ? <Check className="size-3.5" /> : "2"}
                </span>
                <span className="font-display text-xs font-bold text-white">
                  Write proof to Solana Devnet
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Event PDA</span>
            </div>

            <div className="mt-3 pl-8 text-xs text-slate-300">
              {progress.step === 2 && !isStep2Done && !isFailed && (
                <div className="flex items-center gap-2 text-violet-300">
                  <Loader2 className="size-3.5 animate-spin" />
                  {progress.stepStatus === "waiting_tx"
                    ? "Chờ Phantom duyệt transaction Registry..."
                    : progress.stepStatus === "sending_tx"
                      ? "Đang gửi transaction lên Solana Devnet..."
                      : "Đang chuẩn bị transaction dual-signer..."}
                </div>
              )}
              {isStep2Done && (
                <div className="space-y-1 text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    <span>Solana Devnet transaction confirmed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    <span>Event PDA verified on RPC</span>
                  </div>
                </div>
              )}
              {progress.step === 1 && (
                <p className="text-slate-500">Chờ hoàn tất bước 1...</p>
              )}
            </div>
          </div>
        </div>

        {/* Success proofs & links */}
        {isStep2Done && (
          <div className="mt-4 space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3 text-xs">
            <p className="font-semibold text-emerald-300">Minh chứng on-chain thành công:</p>
            {progress.txSignature && (
              <a
                href={`https://explorer.solana.com/tx/${progress.txSignature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-slate-300 hover:text-white"
              >
                <span>Transaction Explorer</span>
                <ExternalLink className="size-3 text-slate-500" />
              </a>
            )}
            {progress.eventPda && (
              <a
                href={`https://explorer.solana.com/address/${progress.eventPda}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-slate-300 hover:text-white"
              >
                <span>Event PDA Explorer</span>
                <ExternalLink className="size-3 text-slate-500" />
              </a>
            )}
          </div>
        )}

        {/* Failed error notice */}
        {isFailed && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
            <p className="font-bold text-red-300">Giao dịch Devnet chưa hoàn tất:</p>
            <p className="mt-1">{progress.error}</p>
            <p className="mt-2 text-slate-400">
              Dữ liệu chặng đã được ghi nhận off-chain. Bạn có thể bấm nút &quot;Thử ghi Registry lại&quot; bất cứ lúc nào.
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5">
          {isStep2Done || isFailed ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
            >
              Đóng
            </button>
          ) : (
            <p className="text-center text-[11px] text-slate-500">
              Vui lòng giữ cửa sổ này và xác nhận trên ví Phantom khi có popup.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
