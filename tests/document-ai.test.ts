import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import {
  buildDocumentCrossChecks,
  extractDocumentDemo,
} from "@/lib/ai/document-extraction";
import {
  detectDocumentMimeType,
  documentSha256,
  readManagedDocument,
  readManagedDocumentVerified,
  saveManagedDocument,
} from "@/lib/documents/storage";
import type { DocumentEvidence, TraceEvent } from "@/types/evidence";

const event: TraceEvent = {
  id: "evt-ai-test",
  batchId: "batch-ai-test",
  stage: "packing",
  organizationId: "org-htx-test",
  organizationName: "HTX Đắk Farm",
  location: "Buôn Ma Thuột, Đắk Lắk",
  occurredAt: "2026-08-30T07:15:00.000Z",
  summary: "Đóng gói lô thử nghiệm.",
  metrics: {
    inputWeightKg: 1200,
    outputWeightKg: 1080,
    declaredLossPercent: 10,
  },
  status: "draft",
};

describe("Check-Di document demo pipeline", () => {
  test("detects real document types from magic bytes and hashes content", () => {
    const pdf = Buffer.from("%PDF-1.7\ncheck-di", "ascii");
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);

    expect(detectDocumentMimeType(pdf)).toBe("application/pdf");
    expect(detectDocumentMimeType(png)).toBe("image/png");
    expect(detectDocumentMimeType(Buffer.from("fake png"))).toBeNull();
    expect(documentSha256(pdf)).toHaveLength(64);
  });

  test("stores document bytes off-chain and can read them again", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "check-di-documents-"));
    try {
      const bytes = Buffer.concat([
        Buffer.from("%PDF-1.7\n", "ascii"),
        Buffer.from("Check-Di test document", "utf8"),
      ]);
      const saved = await saveManagedDocument({
        batchId: "batch-test",
        eventId: "event-test",
        filename: "evidence.pdf",
        mimeType: "application/pdf",
        bytes,
        rootDir,
      });
      const reloaded = await readManagedDocument({
        batchId: "batch-test",
        eventId: "event-test",
        documentId: saved.id,
        mimeType: "application/pdf",
        rootDir,
      });

      expect(reloaded.equals(bytes)).toBe(true);
      expect(saved.sha256).toBe(documentSha256(bytes));
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects a stored document when its bytes no longer match the recorded SHA-256", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "check-di-documents-"));
    try {
      const original = Buffer.from("%PDF-1.7\noriginal", "ascii");
      const saved = await saveManagedDocument({
        batchId: "batch-tamper-test",
        eventId: "event-tamper-test",
        filename: "evidence.pdf",
        mimeType: "application/pdf",
        bytes: original,
        rootDir,
      });

      await writeFile(saved.filePath, Buffer.from("%PDF-1.7\ntampered", "ascii"));

      expect(
        readManagedDocumentVerified({
          batchId: "batch-tamper-test",
          eventId: "event-tamper-test",
          documentId: saved.id,
          mimeType: "application/pdf",
          expectedSha256: saved.sha256,
          rootDir,
        }),
      ).rejects.toThrow("document_hash_mismatch");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("runs deterministic demo extraction without API keys", () => {
    const extraction = extractDocumentDemo({
      filename: "DUR-260830-01_HTX-Dak-Farm_1080kg_PK-0830.pdf",
      mimeType: "application/pdf",
      context: {
        publicId: "DUR-260830-01",
        productName: "Sầu riêng Ri6",
        origin: "Krông Pắc, Đắk Lắk",
        event,
      },
    });

    expect(extraction.status).toBe("completed");
    expect(extraction.provider).toBe("demo");
    expect(extraction.model).toBe("deterministic-v1");
    expect(extraction.simulated).toBe(true);
    expect(extraction.batchId).toBe("DUR-260830-01");
    expect(extraction.organizationName).toBe("HTX Đắk Farm");
    expect(extraction.quantity).toBe(1080);
    expect(extraction.unit).toBe("kg");
    expect(extraction.notes?.[0]).toContain("không phải OCR/LLM");
  });

  test("flags a demo filename batch mismatch while matching quantity", () => {
    const evidence: DocumentEvidence = {
      id: "doc-test",
      filename: "WRONG-999-01_1080kg_PK-0830.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1234,
      sha256: "a".repeat(64),
      uploadedAt: "2026-08-30T08:00:00.000Z",
      extraction: extractDocumentDemo({
        filename: "WRONG-999-01_1080kg_PK-0830.pdf",
        mimeType: "application/pdf",
        context: {
          publicId: "DUR-260830-01",
          productName: "Sầu riêng Ri6",
          origin: "Krông Pắc, Đắk Lắk",
          event,
        },
      }),
    };

    const validations = buildDocumentCrossChecks({
      batch: { publicId: "DUR-260830-01", origin: "Krông Pắc, Đắk Lắk" },
      event,
      evidence,
    });

    expect(
      validations.some(
        (item) => item.status === "warning" && item.fields.includes("batchId"),
      ),
    ).toBe(true);
    const batchMismatch = validations.find((item) =>
      item.fields.includes("batchId"),
    );
    expect(batchMismatch?.severity).toBe("HIGH");
    expect(batchMismatch?.evidence?.sourceField).toBe("batchId");
    expect(batchMismatch?.evidence?.extractedValue).toBe("WRONG-999-01");
    expect(batchMismatch?.evidence?.expectedValue).toBe("DUR-260830-01");
    expect(
      validations.some(
        (item) => item.status === "matched" && item.fields.includes("quantity"),
      ),
    ).toBe(true);
  });
});
