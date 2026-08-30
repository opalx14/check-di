import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { checkChronology, checkPackingLoss } from "@/lib/ai/trace-checks";
import { getSampleBatch } from "@/lib/db/sample-batch";
import { confirmTraceEvent, verifyTraceChain } from "@/lib/traceability/server";
import type { AIValidation, ProductBatch, TraceEvent } from "@/types/evidence";

export type ManagedProductBatch = ProductBatch & {
  createdAt: string;
  updatedAt: string;
};

export type CreateBatchInput = {
  productName: string;
  origin: string;
  publicId?: string;
};

export type CreateDraftTraceEventInput = {
  stage: TraceEvent["stage"];
  organizationName: string;
  location: string;
  occurredAt: string;
  summary: string;
  documents?: string[];
  metrics?: Record<string, string | number | boolean>;
};

type StoreData = {
  version: 1;
  batches: ManagedProductBatch[];
};

const DEFAULT_DATA_FILE = join(process.cwd(), ".data", "check-di-store.json");
const SAMPLE_PUBLIC_ID = "DUR-260830-01";

function normalizePublicId(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").replace(/-+/g, "-");
}

function slugOrganization(value: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `org-${slug || "demo"}`;
}

function generatePublicId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `CD-${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

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

function buildAiValidations(
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
          message: "Chưa có chặng thu hoạch đã xác nhận để đối chiếu thời gian kiểm định.",
          fields: ["harvestAt", "inspectionAt"],
        },
      ];
    }

    return [
      checkChronology({ harvestAt: harvest.occurredAt, inspectionAt: input.occurredAt }),
    ];
  }

  return [];
}

export function createFileBatchRepository(
  filePath = process.env.CHECK_DI_DATA_FILE || DEFAULT_DATA_FILE,
) {
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
          organizationId: slugOrganization(organizationName),
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

    async confirmEvent(batchId: string, eventId: string) {
      return mutate((store) => {
        const batch = store.batches.find((item) => item.id === batchId);
        if (!batch) throw new Error("batch_not_found");

        const eventIndex = batch.events.findIndex((event) => event.id === eventId);
        if (eventIndex < 0) throw new Error("event_not_found");

        const draft = batch.events[eventIndex];
        if (draft.status !== "draft") throw new Error("event_not_draft");

        const confirmedEvents = batch.events.filter(
          (event, index) => index < eventIndex && event.status === "confirmed",
        );
        const previousEventHash =
          confirmedEvents.at(-1)?.eventHash ?? "GENESIS";

        const confirmed = confirmTraceEvent(
          {
            id: draft.id,
            batchId: draft.batchId,
            stage: draft.stage,
            organizationId: draft.organizationId,
            organizationName: draft.organizationName,
            location: draft.location,
            occurredAt: draft.occurredAt,
            summary: draft.summary,
            documents: draft.documents,
            metrics: draft.metrics,
            aiValidations: draft.aiValidations,
          },
          previousEventHash,
        );

        batch.events[eventIndex] = confirmed;
        batch.updatedAt = new Date().toISOString();
        return clone(confirmed);
      });
    },

    async getPublicProof(publicId: string) {
      const store = await readStore();
      const storedBatch = store.batches.find(
        (item) => item.publicId === normalizePublicId(publicId),
      );
      if (!storedBatch) return null;

      const batch = clone(storedBatch);
      const events = batch.events.filter((event) => event.status === "confirmed");
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

export const batchRepository = createFileBatchRepository();
