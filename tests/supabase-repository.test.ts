import { describe, expect, test } from "bun:test";

import { resolveDatabaseDriver } from "@/lib/db";
import { createSupabaseBatchRepository } from "@/lib/db/supabase-repository";
import { confirmTraceEvent } from "@/lib/traceability/server";
import type { DocumentEvidence } from "@/types/evidence";

const evidence: DocumentEvidence = {
  id: "doc-supabase-test",
  filename: "DUR-DB-01_1080kg.pdf",
  mimeType: "application/pdf",
  sizeBytes: 2048,
  sha256: "a".repeat(64),
  uploadedAt: "2026-08-30T08:00:00.000Z",
  extraction: {
    status: "completed",
    provider: "demo",
    model: "deterministic-v1",
    simulated: true,
    documentType: "Packing list / biên bản đóng gói",
    batchId: "DUR-DB-01",
    quantity: 1080,
    unit: "kg",
    confidence: 0.6,
  },
};

const validation = {
  status: "matched" as const,
  message: "Khối lượng khớp dữ liệu chặng.",
  fields: ["quantity", "metrics"],
  sourceDocumentId: evidence.id,
};

const confirmed = confirmTraceEvent(
  {
    id: "evt-supabase-test",
    batchId: "batch-supabase-test",
    stage: "packing",
    organizationId: "org-dak-farm",
    organizationName: "HTX Đắk Farm",
    location: "Buôn Ma Thuột, Đắk Lắk",
    occurredAt: "2026-08-30T07:15:00.000Z",
    summary: "Đóng gói lô thử nghiệm.",
    documents: [evidence.filename],
    documentEvidence: [evidence],
    metrics: {
      inputWeightKg: 1200,
      outputWeightKg: 1080,
      declaredLossPercent: 10,
    },
    aiValidations: [validation],
  },
  "GENESIS",
);

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Check-Di database adapter", () => {
  test("defaults to file storage and accepts the Supabase driver explicitly", () => {
    expect(resolveDatabaseDriver(undefined)).toBe("file");
    expect(resolveDatabaseDriver(" file ")).toBe("file");
    expect(resolveDatabaseDriver("SUPABASE")).toBe("supabase");
    expect(() => resolveDatabaseDriver("sqlite")).toThrow(
      "unsupported_database_driver:sqlite",
    );
  });

  test("hydrates normalized Supabase rows into the existing Check-Di domain model", async () => {
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      const resource = url.pathname.split("/").at(-1)?.replace(/^check_di_/, "");

      if (resource === "batches") {
        return jsonResponse([
          {
            id: "batch-supabase-test",
            public_id: "DUR-DB-01",
            product_name: "Sầu riêng Ri6",
            origin: "Krông Pắc, Đắk Lắk",
            created_at: "2026-08-30T06:40:00.000Z",
            updated_at: "2026-08-30T08:10:00.000Z",
          },
        ]);
      }

      if (resource === "trace_events") {
        return jsonResponse([
          {
            id: confirmed.id,
            batch_id: confirmed.batchId,
            sequence_no: 1,
            stage: confirmed.stage,
            organization_id: confirmed.organizationId,
            organization_name_snapshot: confirmed.organizationName,
            location: confirmed.location,
            occurred_at: confirmed.occurredAt,
            summary: confirmed.summary,
            documents: confirmed.documents,
            metrics: confirmed.metrics,
            status: confirmed.status,
            previous_event_hash: confirmed.previousEventHash,
            event_hash: confirmed.eventHash,
            signer_public_key: confirmed.signerPublicKey,
            signature: confirmed.signature,
            created_at: "2026-08-30T07:15:00.000Z",
            confirmed_at: "2026-08-30T07:16:00.000Z",
          },
        ]);
      }

      if (resource === "documents") {
        return jsonResponse([
          {
            id: evidence.id,
            event_id: confirmed.id,
            filename: evidence.filename,
            mime_type: evidence.mimeType,
            size_bytes: evidence.sizeBytes,
            sha256: evidence.sha256,
            uploaded_at: evidence.uploadedAt,
          },
        ]);
      }

      if (resource === "document_extractions") {
        return jsonResponse([
          { document_id: evidence.id, extraction: evidence.extraction },
        ]);
      }

      if (resource === "ai_checks") {
        return jsonResponse([
          {
            id: "check-supabase-test",
            event_id: confirmed.id,
            document_id: evidence.id,
            status: validation.status,
            message: validation.message,
            fields: validation.fields,
            created_at: "2026-08-30T08:00:00.000Z",
          },
        ]);
      }

      if (resource === "integrity_proofs") {
        return jsonResponse([
          {
            event_id: confirmed.id,
            network: "devnet",
            kind: "check-di-registry",
            program_id: "9sNDitEeYSFQ7LxmNuaiZPoCLVdrzhdR8P5zmoEW78Yi",
            status: "confirmed",
            transaction_signature: "tx-supabase-test",
            slot: 490197159,
            payer_public_key: "payer-test",
            organization_public_key: "organization-test",
            registry_address: "batch-pda-test",
            event_pda: "event-pda-test",
            memo: null,
            explorer_url: "https://explorer.solana.com/tx/test?cluster=devnet",
            registry_explorer_url: null,
            event_explorer_url: null,
            anchored_at: "2026-08-30T08:01:00.000Z",
            attempted_at: "2026-08-30T08:01:00.000Z",
            error: null,
          },
        ]);
      }

      throw new Error(`unexpected_supabase_resource:${resource}`);
    }) as typeof fetch;

    const repository = createSupabaseBatchRepository({
      url: "https://check-di.supabase.co",
      serviceRoleKey: "service-role-test",
      fetchImpl,
    });

    const proof = await repository.getPublicProof("dur-db-01");
    expect(proof?.publicId).toBe("DUR-DB-01");
    expect(proof?.events).toHaveLength(1);
    expect(proof?.events[0]?.documentEvidence?.[0]?.sha256).toBe(
      evidence.sha256,
    );
    expect(proof?.events[0]?.aiValidations?.[0]?.sourceDocumentId).toBe(
      evidence.id,
    );
    expect(proof?.events[0]?.solanaProof?.eventPda).toBe("event-pda-test");
    expect(proof?.chainVerification.valid).toBe(true);
  });
});
