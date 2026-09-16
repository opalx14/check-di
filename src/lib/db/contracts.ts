import { randomUUID } from "node:crypto";

import { checkChronology, checkPackingLoss } from "@/lib/ai/trace-checks";
import type {
  AIValidation,
  DocumentEvidence,
  ProductBatch,
  SolanaIntegrityProof,
  TraceEvent,
} from "@/types/evidence";

export type ManagedProductBatch = ProductBatch & {
  createdByOrganizationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateBatchInput = {
  productName: string;
  origin: string;
  publicId?: string;
  createdByOrganizationId?: string;
};

export type ExternalEventSignature = {
  signerPublicKey: string;
  signature: string;
};

export type PreparedEventConfirmation = {
  eventId: string;
  organizationId: string;
  previousEventHash: string;
  eventHash: string;
};

export type CreateDraftTraceEventInput = {
  stage: TraceEvent["stage"];
  organizationId?: string;
  organizationName: string;
  location: string;
  occurredAt: string;
  summary: string;
  documents?: string[];
  metrics?: Record<string, string | number | boolean>;
};

export type BatchRepository = {
  listBatches(): Promise<ManagedProductBatch[]>;
  getBatchById(id: string): Promise<ManagedProductBatch | null>;
  getBatchByPublicId(publicId: string): Promise<ManagedProductBatch | null>;
  createBatch(input: CreateBatchInput): Promise<ManagedProductBatch>;
  addDraftEvent(
    batchId: string,
    input: CreateDraftTraceEventInput,
  ): Promise<TraceEvent>;
  attachDocumentEvidence(
    batchId: string,
    eventId: string,
    evidence: DocumentEvidence,
    validations: AIValidation[],
  ): Promise<TraceEvent>;
  updateDocumentEvidenceAnalysis(
    batchId: string,
    eventId: string,
    evidence: DocumentEvidence,
    validations: AIValidation[],
  ): Promise<TraceEvent>;
  prepareEventConfirmation(
    batchId: string,
    eventId: string,
  ): Promise<PreparedEventConfirmation>;
  confirmEvent(
    batchId: string,
    eventId: string,
    externalSignature?: ExternalEventSignature,
  ): Promise<TraceEvent>;
  setEventStatus(
    batchId: string,
    eventId: string,
    status: Extract<TraceEvent["status"], "revoked" | "superseded">,
  ): Promise<TraceEvent>;
  setSolanaProof(
    batchId: string,
    eventId: string,
    solanaProof: SolanaIntegrityProof,
  ): Promise<TraceEvent>;
  getPublicProof(publicId: string): Promise<
    | (ManagedProductBatch & {
        chainVerification: ReturnType<
          typeof import("@/lib/traceability/server").verifyTraceChain
        >;
      })
    | null
  >;
};

export function normalizePublicId(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-");
}

export function slugOrganization(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[Đđ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `org-${slug || "demo"}`;
}

export function generatePublicId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `CD-${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export function buildAiValidations(
  input: CreateDraftTraceEventInput,
  existingEvents: TraceEvent[],
): AIValidation[] {
  if (input.stage === "packing") {
    const inputWeightKg = Number(input.metrics?.inputWeightKg);
    const outputWeightKg = Number(input.metrics?.outputWeightKg);
    const declaredLossPercent = Number(input.metrics?.declaredLossPercent);

    if (
      Number.isFinite(inputWeightKg) &&
      inputWeightKg > 0 &&
      Number.isFinite(outputWeightKg) &&
      outputWeightKg >= 0 &&
      Number.isFinite(declaredLossPercent)
    ) {
      return [
        checkPackingLoss({ inputWeightKg, outputWeightKg, declaredLossPercent }),
      ];
    }

    return [
      {
        status: "needs_review",
        message: "Thiếu dữ liệu khối lượng để đối chiếu hao hụt đóng gói.",
        fields: ["inputWeightKg", "outputWeightKg", "declaredLossPercent"],
      },
    ];
  }

  if (input.stage === "inspection") {
    const harvest = existingEvents.find(
      (event) => event.stage === "production" && event.status === "confirmed",
    );

    if (!harvest) {
      return [
        {
          status: "needs_review",
          message:
            "Chưa có chặng thu hoạch đã xác nhận để đối chiếu thời gian kiểm định.",
          fields: ["harvestAt", "inspectionAt"],
        },
      ];
    }

    return [
      checkChronology({
        harvestAt: harvest.occurredAt,
        inspectionAt: input.occurredAt,
      }),
    ];
  }

  return [];
}
