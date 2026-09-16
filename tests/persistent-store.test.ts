import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { createFileBatchRepository } from "@/lib/db/persistent-store";
import { verifyTraceEvent } from "@/lib/traceability/server";

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

      const withSolanaProof = await repository.setSolanaProof(batch.id, draft.id, {
        network: "devnet",
        kind: "spl-memo",
        programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
        status: "confirmed",
        transactionSignature: "demo-devnet-signature",
        slot: 123,
        payerPublicKey: "demo-payer",
        memo: "demo-memo",
        explorerUrl: "https://explorer.solana.com/tx/demo-devnet-signature?cluster=devnet",
        anchoredAt: "2026-08-30T08:30:00.000Z",
        attemptedAt: "2026-08-30T08:30:00.000Z",
      });
      expect(withSolanaProof.solanaProof?.status).toBe("confirmed");

      const proof = await repository.getPublicProof(batch.publicId);
      expect(proof?.events[0]?.solanaProof?.transactionSignature).toBe("demo-devnet-signature");
    });
  });

  test("persists document evidence on draft and includes it in the signed event", async () => {
    await withRepository(async (repository) => {
      const batch = await repository.createBatch({
        productName: "Sầu riêng Ri6",
        origin: "Đắk Lắk",
        publicId: "DOC-TEST-001",
      });
      const draft = await repository.addDraftEvent(batch.id, {
        stage: "production",
        organizationName: "Vườn Test",
        location: "Krông Pắc, Đắk Lắk",
        occurredAt: "2026-08-30T06:00:00+07:00",
        summary: "Thu hoạch lô test có chứng từ.",
      });

      const withDocument = await repository.attachDocumentEvidence(
        batch.id,
        draft.id,
        {
          id: "doc-test-001",
          filename: "nhat-ky.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          sha256: "b".repeat(64),
          uploadedAt: "2026-08-30T06:05:00.000Z",
          extraction: {
            status: "completed",
            provider: "demo",
            model: "deterministic-v1",
            simulated: true,
            documentType: "Nhật ký thu hoạch",
            batchId: "DOC-TEST-001",
            confidence: 0.5,
          },
        },
        [
          {
            status: "matched",
            message: "Mã lô trên chứng từ khớp.",
            fields: ["batchId"],
            sourceDocumentId: "doc-test-001",
          },
        ],
      );

      expect(withDocument.documentEvidence?.[0]?.sha256).toBe("b".repeat(64));
      expect(withDocument.aiValidations?.[0]?.sourceDocumentId).toBe("doc-test-001");

      const confirmed = await repository.confirmEvent(batch.id, draft.id);
      expect(confirmed.documentEvidence?.[0]?.extraction.status).toBe("completed");
      expect(confirmed.eventHash).toHaveLength(64);

      const tampered = structuredClone(confirmed);
      if (!tampered.documentEvidence?.[0]) throw new Error("document_evidence_missing");
      tampered.documentEvidence[0].sha256 = "c".repeat(64);
      expect(verifyTraceEvent(tampered).hashValid).toBe(false);

      const proof = await repository.getPublicProof(batch.publicId);
      expect(proof?.chainVerification.valid).toBe(true);
      expect(proof?.events[0]?.documentEvidence?.[0]?.filename).toBe("nhat-ky.pdf");
    });
  });

  test("keeps terminal events in the hash chain when a correction is added", async () => {
    await withRepository(async (repository) => {
      const batch = await repository.createBatch({
        productName: "Cà phê",
        origin: "Lâm Đồng",
        publicId: "COF-LIFECYCLE-001",
      });
      const original = await repository.addDraftEvent(batch.id, {
        stage: "production",
        organizationName: "Trang trại Lifecycle",
        location: "Lâm Đồng",
        occurredAt: "2026-08-31T08:00:00+07:00",
        summary: "Bản ghi ban đầu cần được thay thế.",
      });
      const signedOriginal = await repository.confirmEvent(batch.id, original.id);
      const superseded = await repository.setEventStatus(
        batch.id,
        original.id,
        "superseded",
      );
      expect(superseded.status).toBe("superseded");

      const correction = await repository.addDraftEvent(batch.id, {
        stage: "production",
        organizationName: "Trang trại Lifecycle",
        location: "Lâm Đồng",
        occurredAt: "2026-08-31T08:05:00+07:00",
        summary: "Bản ghi thay thế đã hiệu chỉnh.",
      });
      const signedCorrection = await repository.confirmEvent(
        batch.id,
        correction.id,
      );
      expect(signedCorrection.previousEventHash).toBe(
        signedOriginal.eventHash,
      );

      const proof = await repository.getPublicProof(batch.publicId);
      expect(proof?.events.map((event) => event.status)).toEqual([
        "superseded",
        "confirmed",
      ]);
      expect(proof?.chainVerification.valid).toBe(true);
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
