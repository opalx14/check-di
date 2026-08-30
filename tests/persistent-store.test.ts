import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { createFileBatchRepository } from "@/lib/db/persistent-store";

async function withRepository(
  callback: (repo: ReturnType<typeof createFileBatchRepository>, filePath: string) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), "check-di-store-"));
  const filePath = join(directory, "store.json");

  try {
    await callback(createFileBatchRepository(filePath), filePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("Check-Di persistent batch workflow", () => {
  test("persists a batch and only hashes/signs when an event is confirmed", async () => {
    await withRepository(async (repository) => {
      const batch = await repository.createBatch({
        productName: "Cà phê Arabica",
        origin: "Cầu Đất, Đà Lạt",
        publicId: "COF-TEST-001",
      });

      const draft = await repository.addDraftEvent(batch.id, {
        stage: "production",
        organizationName: "Nông trại Cầu Đất",
        location: "Đà Lạt, Lâm Đồng",
        occurredAt: "2026-08-30T08:00:00+07:00",
        summary: "Thu hoạch lô cà phê thử nghiệm.",
        documents: ["Nhật ký thu hoạch"],
      });

      expect(draft.status).toBe("draft");
      expect(draft.eventHash).toBeUndefined();
      expect(draft.signature).toBeUndefined();

      const confirmed = await repository.confirmEvent(batch.id, draft.id);
      expect(confirmed.status).toBe("confirmed");
      expect(confirmed.previousEventHash).toBe("GENESIS");
      expect(confirmed.eventHash).toHaveLength(64);
      expect(confirmed.signature?.length).toBeGreaterThan(40);
    });
  });

  test("persists across repository instances and links the next confirmed event", async () => {
    await withRepository(async (repository, filePath) => {
      const batch = await repository.createBatch({
        productName: "Thanh long",
        origin: "Bình Thuận",
        publicId: "DRG-TEST-002",
      });

      const harvest = await repository.addDraftEvent(batch.id, {
        stage: "production",
        organizationName: "Vườn Bình Thuận",
        location: "Hàm Thuận Nam, Bình Thuận",
        occurredAt: "2026-08-30T06:00:00+07:00",
        summary: "Thu hoạch 500 kg thanh long.",
      });
      const signedHarvest = await repository.confirmEvent(batch.id, harvest.id);

      const packing = await repository.addDraftEvent(batch.id, {
        stage: "packing",
        organizationName: "HTX Thanh Long",
        location: "Phan Thiết, Bình Thuận",
        occurredAt: "2026-08-30T12:00:00+07:00",
        summary: "Đóng gói 450 kg từ 500 kg đầu vào.",
        metrics: {
          inputWeightKg: 500,
          outputWeightKg: 450,
          declaredLossPercent: 10,
        },
      });
      expect(packing.aiValidations?.[0]?.status).toBe("matched");

      const signedPacking = await repository.confirmEvent(batch.id, packing.id);
      expect(signedPacking.previousEventHash).toBe(signedHarvest.eventHash);

      const reloadedRepository = createFileBatchRepository(filePath);
      const reloaded = await reloadedRepository.getBatchById(batch.id);
      expect(reloaded?.events).toHaveLength(2);

      const proof = await reloadedRepository.getPublicProof(batch.publicId);
      expect(proof?.chainVerification.valid).toBe(true);
      expect(proof?.events).toHaveLength(2);
    });
  });
});
