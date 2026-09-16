import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
import { getSampleBatch } from "@/lib/db/sample-batch";
import {
  buildTraceEventHash,
  confirmTraceEvent,
  confirmTraceEventWithExternalSignature,
  verifyTraceChain,
} from "@/lib/traceability/server";
import type {
  AIValidation,
  DocumentEvidence,
  SolanaIntegrityProof,
  TraceEvent,
} from "@/types/evidence";

export type {
  CreateBatchInput,
  CreateDraftTraceEventInput,
  ManagedProductBatch,
} from "@/lib/db/contracts";

type StoreData = {
  version: 1;
  batches: ManagedProductBatch[];
};

const DEFAULT_DATA_FILE = join(process.cwd(), ".data", "check-di-store.json");
const SAMPLE_PUBLIC_ID = "DUR-260830-01";

function toSeedBatch(): ManagedProductBatch {
  const sample = getSampleBatch(SAMPLE_PUBLIC_ID);
  if (!sample) throw new Error("sample_batch_unavailable");

  return {
    id: sample.id,
    publicId: sample.publicId,
    productName: sample.productName,
    origin: sample.origin,
    events: sample.events,
    createdAt: "2026-08-30T06:40:00+07:00",
    updatedAt: "2026-09-03T08:10:00+07:00",
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createFileBatchRepository(
  filePath = process.env.CHECK_DI_DATA_FILE || DEFAULT_DATA_FILE,
): BatchRepository {
  let writeQueue = Promise.resolve();

  async function writeStore(store: StoreData) {
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  }

  async function readStore(): Promise<StoreData> {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreData;
      if (parsed.version !== 1 || !Array.isArray(parsed.batches)) {
        throw new Error("unsupported_store_format");
      }
      return parsed;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;

      const initial: StoreData = { version: 1, batches: [toSeedBatch()] };
      await writeStore(initial);
      return initial;
    }
  }

  function mutate<T>(operation: (store: StoreData) => Promise<T> | T): Promise<T> {
    let resolveResult: (value: T | PromiseLike<T>) => void;
    let rejectResult: (reason?: unknown) => void;
    const result = new Promise<T>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });

    writeQueue = writeQueue.then(async () => {
      try {
        const store = await readStore();
        const value = await operation(store);
        await writeStore(store);
        resolveResult(value);
      } catch (error) {
        rejectResult(error);
      }
    });

    return result;
  }

  return {
    async listBatches() {
      const store = await readStore();
      return clone(store.batches);
    },

    async getBatchById(id: string) {
      const store = await readStore();
      const batch = store.batches.find((item) => item.id === id);
      return batch ? clone(batch) : null;
    },

    async getBatchByPublicId(publicId: string) {
      const store = await readStore();
      const batch = store.batches.find(
        (item) => item.publicId === normalizePublicId(publicId),
      );
      return batch ? clone(batch) : null;
    },

    async createBatch(input: CreateBatchInput) {
      const productName = input.productName.trim();
      const origin = input.origin.trim();
      if (!productName || !origin) throw new Error("invalid_batch_input");

      return mutate((store) => {
        const publicId = normalizePublicId(input.publicId || generatePublicId());
        if (publicId.length < 4) throw new Error("invalid_public_id");
        if (store.batches.some((batch) => batch.publicId === publicId)) {
          throw new Error("public_id_exists");
        }

        const now = new Date().toISOString();
        const batch: ManagedProductBatch = {
          id: `batch-${randomUUID()}`,
          publicId,
          productName,
          origin,
          createdByOrganizationId: input.createdByOrganizationId,
          events: [],
          createdAt: now,
          updatedAt: now,
        };

        store.batches.unshift(batch);
        return clone(batch);
      });
    },

    async addDraftEvent(batchId: string, input: CreateDraftTraceEventInput) {
      return mutate((store) => {
        const batch = store.batches.find((item) => item.id === batchId);
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

        const event: TraceEvent = {
          id: `evt-${randomUUID()}`,
          batchId: batch.id,
          stage: input.stage,
          organizationId: input.organizationId ?? slugOrganization(organizationName),
          organizationName,
          location,
          occurredAt,
          summary,
          documents: (input.documents ?? []).map((item) => item.trim()).filter(Boolean),
          metrics: input.metrics ?? {},
          aiValidations: buildAiValidations(input, batch.events),
          status: "draft",
        };

        batch.events.push(event);
        batch.updatedAt = new Date().toISOString();
        return clone(event);
      });
    },

    async attachDocumentEvidence(
      batchId: string,
      eventId: string,
      evidence: DocumentEvidence,
      validations: AIValidation[],
    ) {
      return mutate((store) => {
        const batch = store.batches.find((item) => item.id === batchId);
        if (!batch) throw new Error("batch_not_found");

        const event = batch.events.find((item) => item.id === eventId);
        if (!event) throw new Error("event_not_found");
        if (event.status !== "draft") throw new Error("event_not_draft");

        const existingEvidence = event.documentEvidence ?? [];
        if (existingEvidence.length >= 5) throw new Error("document_limit_reached");
        if (existingEvidence.some((item) => item.id === evidence.id)) {
          throw new Error("document_exists");
        }

        event.documentEvidence = [...existingEvidence, evidence];
        event.documents = Array.from(
          new Set([...(event.documents ?? []), evidence.filename]),
        );
        event.aiValidations = [
          ...(event.aiValidations ?? []).filter(
            (validation) => validation.sourceDocumentId !== evidence.id,
          ),
          ...validations,
        ];
        batch.updatedAt = new Date().toISOString();
        return clone(event);
      });
    },

    async updateDocumentEvidenceAnalysis(
      batchId: string,
      eventId: string,
      evidence: DocumentEvidence,
      validations: AIValidation[],
    ) {
      return mutate((store) => {
        const batch = store.batches.find((item) => item.id === batchId);
        if (!batch) throw new Error("batch_not_found");

        const event = batch.events.find((item) => item.id === eventId);
        if (!event) throw new Error("event_not_found");
        if (event.status !== "draft") throw new Error("event_not_draft");

        const documentIndex = (event.documentEvidence ?? []).findIndex(
          (item) => item.id === evidence.id,
        );
        if (documentIndex < 0) throw new Error("document_not_found");

        event.documentEvidence![documentIndex] = evidence;
        event.aiValidations = [
          ...(event.aiValidations ?? []).filter(
            (validation) => validation.sourceDocumentId !== evidence.id,
          ),
          ...validations,
        ];
        batch.updatedAt = new Date().toISOString();
        return clone(event);
      });
    },

    async prepareEventConfirmation(batchId: string, eventId: string) {
      const store = await readStore();
      const batch = store.batches.find((item) => item.id === batchId);
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
      batchId: string,
      eventId: string,
      externalSignature?: ExternalEventSignature,
    ) {
      return mutate((store) => {
        const batch = store.batches.find((item) => item.id === batchId);
        if (!batch) throw new Error("batch_not_found");

        const eventIndex = batch.events.findIndex((event) => event.id === eventId);
        if (eventIndex < 0) throw new Error("event_not_found");

        const draft = batch.events[eventIndex];
        if (draft.status !== "draft") throw new Error("event_not_draft");

        const confirmedEvents = batch.events.filter(
          (event, index) => index < eventIndex && event.status !== "draft",
        );
        const previousEventHash =
          confirmedEvents.at(-1)?.eventHash ?? "GENESIS";
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

        batch.events[eventIndex] = confirmed;
        batch.updatedAt = new Date().toISOString();
        return clone(confirmed);
      });
    },

    async setEventStatus(batchId, eventId, status) {
      return mutate((store) => {
        const batch = store.batches.find((item) => item.id === batchId);
        if (!batch) throw new Error("batch_not_found");
        const event = batch.events.find((item) => item.id === eventId);
        if (!event) throw new Error("event_not_found");
        if (event.status !== "confirmed") {
          throw new Error("event_status_transition_invalid");
        }
        event.status = status;
        batch.updatedAt = new Date().toISOString();
        return clone(event);
      });
    },

    async setSolanaProof(
      batchId: string,
      eventId: string,
      solanaProof: SolanaIntegrityProof,
    ) {
      return mutate((store) => {
        const batch = store.batches.find((item) => item.id === batchId);
        if (!batch) throw new Error("batch_not_found");

        const event = batch.events.find((item) => item.id === eventId);
        if (!event) throw new Error("event_not_found");
        if (event.status !== "confirmed") throw new Error("event_not_confirmed");

        event.solanaProof = solanaProof;
        batch.updatedAt = new Date().toISOString();
        return clone(event);
      });
    },

    async getPublicProof(publicId: string) {
      const store = await readStore();
      const storedBatch = store.batches.find(
        (item) => item.publicId === normalizePublicId(publicId),
      );
      if (!storedBatch) return null;

      const batch = clone(storedBatch);
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
}
