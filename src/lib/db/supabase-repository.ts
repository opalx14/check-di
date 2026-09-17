import { randomUUID } from "node:crypto";

import {
  buildAiValidations,
  generatePublicId,
  normalizePublicId,
  slugOrganization,
  type BatchRepository,
  type CreateBatchInput,
  type CreateDraftTraceEventInput,
  type ExternalEventSignature,
  type ManagedProductBatch,
} from "@/lib/db/contracts";
import { resolveDocumentStorageDriver } from "@/lib/documents";
import { managedDocumentStorageKey } from "@/lib/documents/storage-key";
import {
  buildTraceEventHash,
  confirmTraceEvent,
  confirmTraceEventWithExternalSignature,
  verifyTraceChain,
} from "@/lib/traceability/server";
import type {
  AIValidation,
  DocumentEvidence,
  DocumentExtraction,
  SolanaIntegrityProof,
  TraceEvent,
} from "@/types/evidence";

type FetchLike = typeof fetch;

type SupabaseRepositoryOptions = {
  url?: string;
  serviceRoleKey?: string;
  fetchImpl?: FetchLike;
};

type BatchRow = {
  id: string;
  public_id: string;
  product_name: string;
  origin: string;
  created_by_organization_id: string | null;
  created_at: string;
  updated_at: string;
};

type TraceEventRow = {
  id: string;
  batch_id: string;
  sequence_no: number;
  stage: TraceEvent["stage"];
  organization_id: string;
  organization_name_snapshot: string;
  location: string;
  occurred_at: string;
  summary: string;
  documents: string[] | null;
  metrics: Record<string, string | number | boolean> | null;
  status: TraceEvent["status"];
  previous_event_hash: string | null;
  event_hash: string | null;
  signer_public_key: string | null;
  signature: string | null;
  created_at: string;
  confirmed_at: string | null;
};

type DocumentRow = {
  id: string;
  event_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  uploaded_at: string;
};

type ExtractionRow = {
  document_id: string;
  extraction: DocumentExtraction;
};

type AiCheckRow = {
  id: string;
  event_id: string;
  document_id: string | null;
  status: AIValidation["status"];
  message: string;
  fields: string[];
  created_at: string;
};

type IntegrityProofRow = {
  event_id: string;
  network: "devnet";
  kind: SolanaIntegrityProof["kind"];
  program_id: string;
  status: SolanaIntegrityProof["status"];
  transaction_signature: string | null;
  slot: number | null;
  payer_public_key: string | null;
  organization_public_key: string | null;
  registry_address: string | null;
  event_pda: string | null;
  memo: string | null;
  explorer_url: string | null;
  registry_explorer_url: string | null;
  event_explorer_url: string | null;
  anchored_at: string | null;
  attempted_at: string;
  error: string | null;
};

class SupabaseRestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SupabaseRestError";
    this.status = status;
    this.code = code;
  }
}

function nonEmpty(value: string | undefined, error: string) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(error);
  return normalized.replace(/\/+$/, "");
}

function quotePostgrestValue(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function inFilter(values: string[]) {
  return `in.(${values.map(quotePostgrestValue).join(",")})`;
}

function toSolanaProof(row: IntegrityProofRow | undefined): SolanaIntegrityProof | undefined {
  if (!row) return undefined;
  return {
    network: row.network,
    kind: row.kind,
    programId: row.program_id,
    status: row.status,
    transactionSignature: row.transaction_signature ?? undefined,
    slot: row.slot ?? undefined,
    payerPublicKey: row.payer_public_key ?? undefined,
    organizationPublicKey: row.organization_public_key ?? undefined,
    registryAddress: row.registry_address ?? undefined,
    eventPda: row.event_pda ?? undefined,
    memo: row.memo ?? undefined,
    explorerUrl: row.explorer_url ?? undefined,
    registryExplorerUrl: row.registry_explorer_url ?? undefined,
    eventExplorerUrl: row.event_explorer_url ?? undefined,
    anchoredAt: row.anchored_at ?? undefined,
    attemptedAt: row.attempted_at,
    error: row.error ?? undefined,
  };
}

function toTraceEvent({
  row,
  documents,
  extractions,
  checks,
  proof,
}: {
  row: TraceEventRow;
  documents: DocumentRow[];
  extractions: Map<string, DocumentExtraction>;
  checks: AiCheckRow[];
  proof?: IntegrityProofRow;
}): TraceEvent {
  const documentEvidence = documents.map((document) => {
    const extraction = extractions.get(document.id);
    if (!extraction) throw new Error(`document_extraction_missing:${document.id}`);
    return {
      id: document.id,
      filename: document.filename,
      mimeType: document.mime_type,
      sizeBytes: document.size_bytes,
      sha256: document.sha256,
      uploadedAt: document.uploaded_at,
      extraction,
    } satisfies DocumentEvidence;
  });

  return {
    id: row.id,
    batchId: row.batch_id,
    stage: row.stage,
    organizationId: row.organization_id,
    organizationName: row.organization_name_snapshot,
    location: row.location,
    occurredAt: row.occurred_at,
    summary: row.summary,
    documents: row.documents ?? [],
    ...(documentEvidence.length > 0 ? { documentEvidence } : {}),
    metrics: row.metrics ?? {},
    aiValidations: checks.map((check) => ({
      status: check.status,
      message: check.message,
      fields: check.fields,
      sourceDocumentId: check.document_id ?? undefined,
    })),
    previousEventHash: row.previous_event_hash ?? undefined,
    eventHash: row.event_hash ?? undefined,
    signerPublicKey: row.signer_public_key ?? undefined,
    signature: row.signature ?? undefined,
    solanaProof: toSolanaProof(proof),
    status: row.status,
  };
}

export function createSupabaseBatchRepository(
  options: SupabaseRepositoryOptions = {},
): BatchRepository {
  const url = nonEmpty(
    options.url ?? process.env.CHECK_DI_SUPABASE_URL,
    "supabase_url_missing",
  );
  const serviceRoleKey = nonEmpty(
    options.serviceRoleKey ?? process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY,
    "supabase_service_role_key_missing",
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const restUrl = `${url}/rest/v1`;
  const tableName = (resource: string) => `check_di_${resource}`;

  async function request<T>(
    resource: string,
    {
      query,
      method = "GET",
      body,
      prefer,
    }: {
      query?: Record<string, string>;
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: unknown;
      prefer?: string;
    } = {},
  ): Promise<T> {
    const target = new URL(`${restUrl}/${tableName(resource)}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      target.searchParams.set(key, value);
    }

    const response = await fetchImpl(target, {
      method,
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T & { code?: string; message?: string }) : (null as T);
    if (!response.ok) {
      const errorPayload = payload as { code?: string; message?: string } | null;
      throw new SupabaseRestError(
        errorPayload?.message || `supabase_http_${response.status}`,
        response.status,
        errorPayload?.code,
      );
    }
    return payload as T;
  }

  async function getBatchRow(filter: { id?: string; publicId?: string }) {
    const query: Record<string, string> = { select: "*", limit: "1" };
    if (filter.id) query.id = `eq.${filter.id}`;
    if (filter.publicId) query.public_id = `eq.${normalizePublicId(filter.publicId)}`;
    const rows = await request<BatchRow[]>("batches", { query });
    return rows[0] ?? null;
  }

  async function hydrateBatch(row: BatchRow): Promise<ManagedProductBatch> {
    const events = await request<TraceEventRow[]>("trace_events", {
      query: {
        select: "*",
        batch_id: `eq.${row.id}`,
        order: "sequence_no.asc",
      },
    });

    const eventIds = events.map((event) => event.id);
    let documents: DocumentRow[] = [];
    let checks: AiCheckRow[] = [];
    let proofs: IntegrityProofRow[] = [];
    if (eventIds.length > 0) {
      const eventFilter = inFilter(eventIds);
      [documents, checks, proofs] = await Promise.all([
        request<DocumentRow[]>("documents", {
          query: {
            select: "*",
            event_id: eventFilter,
            order: "uploaded_at.asc,id.asc",
          },
        }),
        request<AiCheckRow[]>("ai_checks", {
          query: {
            select: "*",
            event_id: eventFilter,
            order: "created_at.asc,id.asc",
          },
        }),
        request<IntegrityProofRow[]>("integrity_proofs", {
          query: { select: "*", event_id: eventFilter },
        }),
      ]);
    }

    const documentIds = documents.map((document) => document.id);
    const extractionRows =
      documentIds.length > 0
        ? await request<ExtractionRow[]>("document_extractions", {
            query: {
              select: "document_id,extraction",
              document_id: inFilter(documentIds),
            },
          })
        : [];
    const extractions = new Map(
      extractionRows.map((item) => [item.document_id, item.extraction]),
    );

    return {
      id: row.id,
      publicId: row.public_id,
      productName: row.product_name,
      origin: row.origin,
      createdByOrganizationId: row.created_by_organization_id ?? undefined,
      events: events.map((event) =>
        toTraceEvent({
          row: event,
          documents: documents.filter((document) => document.event_id === event.id),
          extractions,
          checks: checks.filter((check) => check.event_id === event.id),
          proof: proofs.find((proof) => proof.event_id === event.id),
        }),
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function hydrateEvent(batchId: string, eventId: string) {
    const batch = await repository.getBatchById(batchId);
    if (!batch) throw new Error("batch_not_found");
    const event = batch.events.find((item) => item.id === eventId);
    if (!event) throw new Error("event_not_found");
    return event;
  }

  async function replaceDocumentChecks(
    eventId: string,
    documentId: string,
    validations: AIValidation[],
  ) {
    await request<null>("ai_checks", {
      method: "DELETE",
      query: {
        event_id: `eq.${eventId}`,
        document_id: `eq.${documentId}`,
      },
    });

    if (validations.length > 0) {
      await request<AiCheckRow[]>("ai_checks", {
        method: "POST",
        body: validations.map((validation) => ({
          id: `check-${randomUUID()}`,
          event_id: eventId,
          document_id: documentId,
          status: validation.status,
          message: validation.message,
          fields: validation.fields,
        })),
        prefer: "return=minimal",
      });
    }
  }

  const repository: BatchRepository = {
    async listBatches() {
      const rows = await request<BatchRow[]>("batches", {
        query: { select: "*", order: "created_at.desc" },
      });
      return Promise.all(rows.map(hydrateBatch));
    },

    async getBatchById(id: string) {
      const row = await getBatchRow({ id });
      return row ? hydrateBatch(row) : null;
    },

    async getBatchByPublicId(publicId: string) {
      const row = await getBatchRow({ publicId });
      return row ? hydrateBatch(row) : null;
    },

    async createBatch(input: CreateBatchInput) {
      const productName = input.productName.trim();
      const origin = input.origin.trim();
      if (!productName || !origin) throw new Error("invalid_batch_input");

      const publicId = normalizePublicId(input.publicId || generatePublicId());
      if (publicId.length < 4) throw new Error("invalid_public_id");
      const now = new Date().toISOString();
      const batch: BatchRow = {
        id: `batch-${randomUUID()}`,
        public_id: publicId,
        product_name: productName,
        origin,
        created_by_organization_id: input.createdByOrganizationId ?? null,
        created_at: now,
        updated_at: now,
      };

      try {
        const rows = await request<BatchRow[]>("batches", {
          method: "POST",
          body: batch,
          prefer: "return=representation",
        });
        return hydrateBatch(rows[0] ?? batch);
      } catch (error) {
        if (error instanceof SupabaseRestError && error.code === "23505") {
          throw new Error("public_id_exists");
        }
        throw error;
      }
    },

    async addDraftEvent(batchId: string, input: CreateDraftTraceEventInput) {
      const batch = await repository.getBatchById(batchId);
      if (!batch) throw new Error("batch_not_found");
      if (batch.events.some((event) => event.status === "draft")) {
        throw new Error("draft_event_exists");
      }

      const organizationName = input.organizationName.trim();
      const location = input.location.trim();
      const summary = input.summary.trim();
      const occurredAt = new Date(input.occurredAt).toISOString();
      if (!organizationName || !location || !summary) {
        throw new Error("invalid_event_input");
      }

      const organizationId = input.organizationId ?? slugOrganization(organizationName);
      await request("organizations", {
        method: "POST",
        query: { on_conflict: "id" },
        body: {
          id: organizationId,
          name: organizationName,
          slug: organizationId.replace(/^org-/, ""),
          type: "participant",
        },
        prefer: "resolution=merge-duplicates,return=minimal",
      });

      const aiValidations = buildAiValidations(input, batch.events);
      const eventId = `evt-${randomUUID()}`;
      const eventRows = await request<TraceEventRow[]>("trace_events", {
        method: "POST",
        body: {
          id: eventId,
          batch_id: batchId,
          sequence_no: batch.events.length + 1,
          stage: input.stage,
          organization_id: organizationId,
          organization_name_snapshot: organizationName,
          location,
          occurred_at: occurredAt,
          summary,
          documents: (input.documents ?? []).map((item) => item.trim()).filter(Boolean),
          metrics: input.metrics ?? {},
          status: "draft",
        },
        prefer: "return=representation",
      });

      if (aiValidations.length > 0) {
        await request("ai_checks", {
          method: "POST",
          body: aiValidations.map((validation) => ({
            id: `check-${randomUUID()}`,
            event_id: eventId,
            document_id: null,
            status: validation.status,
            message: validation.message,
            fields: validation.fields,
          })),
          prefer: "return=minimal",
        });
      }

      const created = eventRows[0];
      if (!created) throw new Error("event_create_failed");
      return hydrateEvent(batchId, created.id);
    },

    async attachDocumentEvidence(batchId, eventId, evidence, validations) {
      const batch = await repository.getBatchById(batchId);
      if (!batch) throw new Error("batch_not_found");
      const event = batch.events.find((item) => item.id === eventId);
      if (!event) throw new Error("event_not_found");
      if (event.status !== "draft") throw new Error("event_not_draft");
      if ((event.documentEvidence?.length ?? 0) >= 5) {
        throw new Error("document_limit_reached");
      }
      if (event.documentEvidence?.some((item) => item.id === evidence.id)) {
        throw new Error("document_exists");
      }

      const storageBackend = resolveDocumentStorageDriver();
      const storagePath = managedDocumentStorageKey({
        batchId,
        eventId,
        documentId: evidence.id,
        mimeType: evidence.mimeType,
      });
      await request("documents", {
        method: "POST",
        body: {
          id: evidence.id,
          event_id: eventId,
          filename: evidence.filename,
          mime_type: evidence.mimeType,
          size_bytes: evidence.sizeBytes,
          sha256: evidence.sha256,
          storage_backend: storageBackend,
          storage_path: storagePath,
          uploaded_at: evidence.uploadedAt,
        },
        prefer: "return=minimal",
      });
      await request("document_extractions", {
        method: "POST",
        body: {
          document_id: evidence.id,
          provider: evidence.extraction.provider,
          model: evidence.extraction.model,
          is_simulated: evidence.extraction.simulated,
          status: evidence.extraction.status,
          confidence: evidence.extraction.confidence ?? null,
          extraction: evidence.extraction,
        },
        prefer: "return=minimal",
      });
      await replaceDocumentChecks(eventId, evidence.id, validations);

      const nextDocuments = Array.from(
        new Set([...(event.documents ?? []), evidence.filename]),
      );
      await request("trace_events", {
        method: "PATCH",
        query: { id: `eq.${eventId}`, status: "eq.draft" },
        body: { documents: nextDocuments },
        prefer: "return=minimal",
      });

      return hydrateEvent(batchId, eventId);
    },

    async updateDocumentEvidenceAnalysis(batchId, eventId, evidence, validations) {
      const event = await hydrateEvent(batchId, eventId);
      if (event.status !== "draft") throw new Error("event_not_draft");
      if (!event.documentEvidence?.some((item) => item.id === evidence.id)) {
        throw new Error("document_not_found");
      }

      await request("document_extractions", {
        method: "PATCH",
        query: { document_id: `eq.${evidence.id}` },
        body: {
          provider: evidence.extraction.provider,
          model: evidence.extraction.model,
          is_simulated: evidence.extraction.simulated,
          status: evidence.extraction.status,
          confidence: evidence.extraction.confidence ?? null,
          extraction: evidence.extraction,
          updated_at: new Date().toISOString(),
        },
        prefer: "return=minimal",
      });
      await replaceDocumentChecks(eventId, evidence.id, validations);
      return hydrateEvent(batchId, eventId);
    },

    async removeDocumentEvidence(batchId, eventId, documentId) {
      const event = await hydrateEvent(batchId, eventId);
      if (event.status !== "draft") throw new Error("event_not_draft");
      const target = event.documentEvidence?.find((item) => item.id === documentId);
      if (!target) throw new Error("document_not_found");

      await request("ai_checks", {
        method: "DELETE",
        query: { source_document_id: `eq.${documentId}` },
        prefer: "return=minimal",
      });
      await request("document_extractions", {
        method: "DELETE",
        query: { document_id: `eq.${documentId}` },
        prefer: "return=minimal",
      });
      await request("documents", {
        method: "DELETE",
        query: { id: `eq.${documentId}` },
        prefer: "return=minimal",
      });

      const nextDocuments = (event.documentEvidence ?? [])
        .filter((item) => item.id !== documentId)
        .map((item) => item.filename);
      await request("trace_events", {
        method: "PATCH",
        query: { id: `eq.${eventId}`, status: "eq.draft" },
        body: { documents: nextDocuments },
        prefer: "return=minimal",
      });

      return hydrateEvent(batchId, eventId);
    },

    async prepareEventConfirmation(batchId, eventId) {
      const batch = await repository.getBatchById(batchId);
      if (!batch) throw new Error("batch_not_found");
      const eventIndex = batch.events.findIndex((event) => event.id === eventId);
      if (eventIndex < 0) throw new Error("event_not_found");
      const draft = batch.events[eventIndex];
      if (draft.status !== "draft") throw new Error("event_not_draft");
      const previousEventHash =
        batch.events
          .slice(0, eventIndex)
          .filter((event) => event.status !== "draft")
          .at(-1)?.eventHash ?? "GENESIS";
      const input = {
        id: draft.id,
        batchId: draft.batchId,
        stage: draft.stage,
        organizationId: draft.organizationId,
        organizationName: draft.organizationName,
        location: draft.location,
        occurredAt: draft.occurredAt,
        summary: draft.summary,
        documents: draft.documents,
        documentEvidence: draft.documentEvidence,
        metrics: draft.metrics,
        aiValidations: draft.aiValidations,
      };
      return {
        eventId,
        organizationId: draft.organizationId,
        previousEventHash,
        eventHash: buildTraceEventHash(input, previousEventHash),
      };
    },

    async confirmEvent(
      batchId,
      eventId,
      externalSignature?: ExternalEventSignature,
    ) {
      const batch = await repository.getBatchById(batchId);
      if (!batch) throw new Error("batch_not_found");
      const eventIndex = batch.events.findIndex((event) => event.id === eventId);
      if (eventIndex < 0) throw new Error("event_not_found");
      const draft = batch.events[eventIndex];
      if (draft.status !== "draft") throw new Error("event_not_draft");

      const previousEventHash =
        batch.events
          .slice(0, eventIndex)
          .filter((event) => event.status !== "draft")
          .at(-1)?.eventHash ?? "GENESIS";
      const input = {
        id: draft.id,
        batchId: draft.batchId,
        stage: draft.stage,
        organizationId: draft.organizationId,
        organizationName: draft.organizationName,
        location: draft.location,
        occurredAt: draft.occurredAt,
        summary: draft.summary,
        documents: draft.documents,
        documentEvidence: draft.documentEvidence,
        metrics: draft.metrics,
        aiValidations: draft.aiValidations,
      };
      const confirmed = externalSignature
        ? confirmTraceEventWithExternalSignature(
            input,
            previousEventHash,
            externalSignature.signerPublicKey,
            externalSignature.signature,
          )
        : confirmTraceEvent(input, previousEventHash);

      const updated = await request<TraceEventRow[]>("trace_events", {
        method: "PATCH",
        query: {
          id: `eq.${eventId}`,
          batch_id: `eq.${batchId}`,
          status: "eq.draft",
        },
        body: {
          status: "confirmed",
          previous_event_hash: confirmed.previousEventHash,
          event_hash: confirmed.eventHash,
          signer_public_key: confirmed.signerPublicKey,
          signature: confirmed.signature,
          confirmed_at: new Date().toISOString(),
        },
        prefer: "return=representation",
      });
      if (updated.length === 0) throw new Error("event_not_draft");
      return hydrateEvent(batchId, eventId);
    },

    async setEventStatus(batchId, eventId, status) {
      const updated = await request<TraceEventRow[]>("trace_events", {
        method: "PATCH",
        query: {
          id: `eq.${eventId}`,
          batch_id: `eq.${batchId}`,
          status: "eq.confirmed",
        },
        body: { status },
        prefer: "return=representation",
      });
      if (updated.length === 0) {
        const existing = await hydrateEvent(batchId, eventId);
        if (existing.status !== "confirmed") {
          throw new Error("event_status_transition_invalid");
        }
        throw new Error("event_status_update_failed");
      }
      return hydrateEvent(batchId, eventId);
    },

    async setSolanaProof(batchId, eventId, solanaProof) {
      const event = await hydrateEvent(batchId, eventId);
      if (event.status !== "confirmed") throw new Error("event_not_confirmed");

      await request("integrity_proofs", {
        method: "POST",
        query: { on_conflict: "event_id" },
        body: {
          id: `proof-${eventId}`,
          event_id: eventId,
          network: solanaProof.network,
          kind: solanaProof.kind,
          program_id: solanaProof.programId,
          status: solanaProof.status,
          transaction_signature: solanaProof.transactionSignature ?? null,
          slot: solanaProof.slot ?? null,
          payer_public_key: solanaProof.payerPublicKey ?? null,
          organization_public_key: solanaProof.organizationPublicKey ?? null,
          registry_address: solanaProof.registryAddress ?? null,
          event_pda: solanaProof.eventPda ?? null,
          memo: solanaProof.memo ?? null,
          explorer_url: solanaProof.explorerUrl ?? null,
          registry_explorer_url: solanaProof.registryExplorerUrl ?? null,
          event_explorer_url: solanaProof.eventExplorerUrl ?? null,
          anchored_at: solanaProof.anchoredAt ?? null,
          attempted_at: solanaProof.attemptedAt,
          error: solanaProof.error ?? null,
          updated_at: new Date().toISOString(),
        },
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      return hydrateEvent(batchId, eventId);
    },

    async getPublicProof(publicId) {
      const batch = await repository.getBatchByPublicId(publicId);
      if (!batch) return null;
      const events = batch.events.filter((event) => event.status !== "draft");
      const chainVerification = verifyTraceChain(events);
      return {
        ...batch,
        events,
        chainVerification: {
          ...chainVerification,
          valid: events.length > 0 && chainVerification.valid,
        },
      };
    },
  };

  return repository;
}
