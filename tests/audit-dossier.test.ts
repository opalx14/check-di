import { describe, expect, test } from "bun:test";

import {
  AUDIT_DOSSIER_SCHEMA_VERSION,
  buildAuditDossier,
} from "@/lib/audit/dossier";
import type { IndependentDevnetVerification } from "@/lib/solana/verification";

const batch = {
  id: "batch-audit",
  publicId: "AUDIT-260919-01",
  productName: "Dưa hấu",
  origin: "Long An",
  createdAt: "2026-09-19T01:00:00.000Z",
  updatedAt: "2026-09-19T02:00:00.000Z",
  events: [
    {
      id: "evt-audit-1",
      batchId: "batch-audit",
      stage: "production" as const,
      organizationId: "org-audit",
      organizationName: "HTX Demo 0931333131",
      location: "Địa chỉ 477 Nguyễn Văn Công",
      occurredAt: "2026-09-19T01:10:00.000Z",
      summary: "Liên hệ 0931333131, STK: 9931333131",
      documents: ["CCCD-079203001234.pdf"],
      documentEvidence: [
        {
          id: "doc-audit",
          filename: "CCCD-079203001234_STK-9931333131.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          sha256: "a".repeat(64),
          uploadedAt: "2026-09-19T01:15:00.000Z",
          extraction: {
            status: "completed" as const,
            provider: "demo" as const,
            model: "deterministic-v1" as const,
            simulated: true as const,
            notes: ["raw private extraction detail"],
          },
        },
      ],
      metrics: {
        harvestedWeightKg: 1200,
        contact: "0931333131",
      },
      aiValidations: [
        {
          status: "warning" as const,
          message: "Liên hệ 0931333131 để kiểm tra STK: 9931333131",
          fields: ["contact"],
          severity: "MEDIUM" as const,
          evidence: {
            sourceField: "contact",
            sourceText: "CCCD 079203001234",
            extractedValue: "0931333131",
            expectedValue: "STK: 9931333131",
          },
        },
      ],
      previousEventHash: "GENESIS",
      eventHash: "b".repeat(64),
      signerPublicKey: "signer-public-key",
      signature: "signature-value",
      status: "superseded" as const,
    },
  ],
  chainVerification: {
    valid: true,
    checks: [
      {
        eventId: "evt-audit-1",
        stage: "production" as const,
        linkValid: true,
        hashValid: true,
        signatureValid: true,
        valid: true,
      },
    ],
  },
};

const verification: IndependentDevnetVerification = {
  source: "solana-devnet-rpc",
  persistedMirrorTrusted: false,
  valid: true,
  kind: "check-di-registry",
  registryAddress: "registry-address",
  eventPda: "event-pda",
  organizationPublicKey: "organization-public-key",
  checks: {
    authority: true,
    eventHash: true,
    previousEventHash: true,
  },
  registryStatus: "active",
  eventStatus: "superseded",
};

describe("public audit dossier", () => {
  test("exports a redacted audit view without raw private document content", () => {
    const dossier = buildAuditDossier({
      batch,
      devnetEvents: [
        {
          eventId: "evt-audit-1",
          stage: "production",
          verification,
        },
      ],
      generatedAt: "2026-09-19T03:00:00.000Z",
    });

    const serialized = JSON.stringify(dossier);

    expect(dossier.schemaVersion).toBe(AUDIT_DOSSIER_SCHEMA_VERSION);
    expect(dossier.scope.redacted).toBe(true);
    expect(dossier.scope.canonicalSignedPayloadIncluded).toBe(false);
    expect(dossier.scope.rawDocumentsIncluded).toBe(false);
    expect(serialized).not.toContain("0931333131");
    expect(serialized).not.toContain("9931333131");
    expect(serialized).not.toContain("079203001234");
    expect(serialized).not.toContain("raw private extraction detail");
    expect(dossier.events[0]?.lifecycleStatus).toBe("superseded");
    expect(dossier.events[0]?.documents[0]?.sha256).toBe("a".repeat(64));
  });

  test("preserves public integrity results and fresh Devnet verification metadata", () => {
    const dossier = buildAuditDossier({
      batch,
      devnetEvents: [
        {
          eventId: "evt-audit-1",
          stage: "production",
          verification,
        },
      ],
      generatedAt: "2026-09-19T03:00:00.000Z",
    });

    expect(dossier.integrity.chainVerification.valid).toBe(true);
    expect(dossier.integrity.devnet.persistedMirrorTrusted).toBe(false);
    expect(dossier.integrity.devnet.verifiedRegistryEvents).toBe(1);
    expect(dossier.integrity.devnet.allRegistryEventsVerified).toBe(true);
    expect(dossier.events[0]?.devnet.eventPda).toBe("event-pda");
    expect(dossier.events[0]?.eventHash).toBe("b".repeat(64));
  });
});
