import {
  buildDocumentCrossChecks,
  extractDocumentDemo,
} from "@/lib/ai/document-extraction";
import type { DocumentEvidence, TraceEvent } from "@/types/evidence";

async function main() {
  const publicId = "DUR-260830-01";
  const filename = "DUR-260830-01_HTX-Dak-Farm_1080kg_PK-0830.pdf";
  const event: TraceEvent = {
    id: "evt-demo-smoke",
    batchId: "batch-demo-smoke",
    stage: "packing",
    organizationId: "org-htx-dak-farm",
    organizationName: "HTX Đắk Farm",
    location: "Buôn Ma Thuột, Đắk Lắk",
    occurredAt: "2026-08-30T07:15:00.000Z",
    summary: "Nhận 1.200 kg và đóng gói 1.080 kg.",
    metrics: {
      inputWeightKg: 1200,
      outputWeightKg: 1080,
      declaredLossPercent: 10,
    },
    status: "draft",
  };

  const extraction = extractDocumentDemo({
    filename,
    mimeType: "application/pdf",
    context: {
      publicId,
      productName: "Sầu riêng Ri6",
      origin: "Krông Pắc, Đắk Lắk",
      event,
    },
  });

  const evidence: DocumentEvidence = {
    id: "doc-demo-smoke",
    filename,
    mimeType: "application/pdf",
    sizeBytes: 1024,
    sha256: "a".repeat(64),
    uploadedAt: new Date().toISOString(),
    extraction,
  };
  const validations = buildDocumentCrossChecks({
    batch: { publicId, origin: "Krông Pắc, Đắk Lắk" },
    event,
    evidence,
  });

  const ok =
    extraction.provider === "demo" &&
    extraction.simulated === true &&
    extraction.batchId === publicId &&
    extraction.quantity === 1080 &&
    validations.some((validation) => validation.status === "matched");

  console.log(JSON.stringify({ ok, extraction, validations }, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
