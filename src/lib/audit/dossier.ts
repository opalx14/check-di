import { redactForPublicDisplay } from "@/lib/ai/pii-redaction";
import type { ManagedProductBatch } from "@/lib/db/contracts";
import type {
  IndependentDevnetVerification,
} from "@/lib/solana/verification";
import type { AIValidation, TraceEvent } from "@/types/evidence";

export const AUDIT_DOSSIER_SCHEMA_VERSION = "check-di-audit-dossier-v1";

type PublicProofBatch = ManagedProductBatch & {
  chainVerification: {
    valid: boolean;
    checks: Array<{
      eventId: string;
      stage: TraceEvent["stage"];
      linkValid: boolean;
      hashValid: boolean;
      signatureValid: boolean;
      valid: boolean;
    }>;
  };
};

export type AuditDossierDevnetEvent = {
  eventId: string;
  stage: TraceEvent["stage"];
  verification: IndependentDevnetVerification;
};

function sanitizeScalar(value: string | number | boolean) {
  return typeof value === "string" ? redactForPublicDisplay(value) : value;
}

function sanitizeValidation(validation: AIValidation) {
  return {
    status: validation.status,
    message: redactForPublicDisplay(validation.message),
    fields: validation.fields,
    ...(validation.sourceDocumentId
      ? { sourceDocumentId: validation.sourceDocumentId }
      : {}),
    ...(validation.severity ? { severity: validation.severity } : {}),
    ...(validation.evidence
      ? {
          evidence: {
            sourceField: validation.evidence.sourceField,
            ...(validation.evidence.sourceText
              ? {
                  sourceText: redactForPublicDisplay(
                    validation.evidence.sourceText,
                  ),
                }
              : {}),
            ...(validation.evidence.extractedValue !== undefined
              ? {
                  extractedValue: sanitizeScalar(
                    validation.evidence.extractedValue,
                  ),
                }
              : {}),
            ...(validation.evidence.expectedValue !== undefined
              ? {
                  expectedValue: sanitizeScalar(
                    validation.evidence.expectedValue,
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
}

function sanitizeMetrics(
  metrics: Record<string, string | number | boolean> | undefined,
) {
  if (!metrics) return {};
  return Object.fromEntries(
    Object.entries(metrics).map(([key, value]) => [key, sanitizeScalar(value)]),
  );
}

function publicDocumentEvidence(event: TraceEvent) {
  return (event.documentEvidence ?? []).map((document) => ({
    id: document.id,
    filename: redactForPublicDisplay(document.filename),
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    sha256: document.sha256,
    uploadedAt: document.uploadedAt,
    privacy: document.extraction.privacy ?? {
      redactionMode: "deterministic-v1" as const,
      applied: true as const,
      redactedCategories: [],
    },
  }));
}

export function buildAuditDossier({
  batch,
  devnetEvents,
  generatedAt = new Date().toISOString(),
}: {
  batch: PublicProofBatch;
  devnetEvents: AuditDossierDevnetEvent[];
  generatedAt?: string;
}) {
  const devnetByEvent = new Map(
    devnetEvents.map((item) => [item.eventId, item.verification]),
  );
  const verifiedRegistryEvents = devnetEvents.filter(
    (item) =>
      item.verification.kind === "check-di-registry" &&
      item.verification.valid,
  ).length;
  const registryEvents = devnetEvents.filter(
    (item) => item.verification.kind === "check-di-registry",
  ).length;

  return {
    schemaVersion: AUDIT_DOSSIER_SCHEMA_VERSION,
    generatedAt,
    scope: {
      publicAuditExport: true,
      redacted: true,
      canonicalSignedPayloadIncluded: false,
      rawDocumentsIncluded: false,
      privateStoragePathsIncluded: false,
      note:
        "This public dossier is a redacted audit view. It preserves proof hashes, signatures, lifecycle and public document hashes, but it is not the canonical signed event payload and does not expose raw private documents.",
    },
    product: {
      publicId: batch.publicId,
      productName: redactForPublicDisplay(batch.productName),
      origin: redactForPublicDisplay(batch.origin),
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      eventCount: batch.events.length,
    },
    integrity: {
      chainVerification: batch.chainVerification,
      devnet: {
        mode: "fresh-devnet-rpc",
        network: "devnet",
        persistedMirrorTrusted: false,
        verifiedRegistryEvents,
        registryEvents,
        allRegistryEventsVerified:
          registryEvents > 0 && verifiedRegistryEvents === registryEvents,
      },
    },
    events: batch.events.map((event) => {
      const devnet = devnetByEvent.get(event.id);
      return {
        id: event.id,
        stage: event.stage,
        lifecycleStatus: event.status,
        organizationId: event.organizationId,
        organizationName: redactForPublicDisplay(event.organizationName),
        location: redactForPublicDisplay(event.location),
        occurredAt: event.occurredAt,
        summary: redactForPublicDisplay(event.summary),
        metrics: sanitizeMetrics(event.metrics),
        previousEventHash: event.previousEventHash,
        eventHash: event.eventHash,
        signerPublicKey: event.signerPublicKey,
        signature: event.signature,
        documents: publicDocumentEvidence(event),
        aiValidations: (event.aiValidations ?? []).map(sanitizeValidation),
        devnet: devnet
          ? {
              valid: devnet.valid,
              kind: devnet.kind,
              source: devnet.source,
              persistedMirrorTrusted: devnet.persistedMirrorTrusted,
              registryAddress: devnet.registryAddress,
              eventPda: devnet.eventPda,
              organizationPublicKey: devnet.organizationPublicKey,
              registryStatus: devnet.registryStatus,
              eventStatus: devnet.eventStatus,
              checks: devnet.checks,
              error: devnet.error,
            }
          : {
              valid: false,
              source: "solana-devnet-rpc" as const,
              persistedMirrorTrusted: false as const,
              error: "verification_missing",
            },
      };
    }),
  };
}
