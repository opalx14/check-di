import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { ProductBatch, TraceEvent } from "@/types/evidence";

type StoreData = {
  version: number;
  batches: Array<ProductBatch & { createdAt?: string; updatedAt?: string }>;
};

const url = process.env.CHECK_DI_SUPABASE_URL?.trim().replace(/\/+$/, "");
const serviceRoleKey = process.env.CHECK_DI_SUPABASE_SERVICE_ROLE_KEY?.trim();
const apply = process.argv.includes("--apply");
const requestedIds = process.argv
  .filter((arg) => arg.startsWith("--public-id="))
  .map((arg) => arg.slice("--public-id=".length).trim())
  .filter(Boolean);
const publicIds = requestedIds.length > 0 ? requestedIds : ["DUR-260830-01", "DUR-260830-02"];
const storePath = resolve(process.env.CHECK_DI_STORE_PATH?.trim() || ".data/check-di-store.json");

if (apply && (!url || !serviceRoleKey)) {
  throw new Error("supabase_credentials_missing");
}

const store = JSON.parse(await readFile(storePath, "utf8")) as StoreData;
if (store.version !== 1 || !Array.isArray(store.batches)) {
  throw new Error("unsupported_store_format");
}

const batches = publicIds.map((publicId) => {
  const batch = store.batches.find((candidate) => candidate.publicId === publicId);
  if (!batch) throw new Error(`batch_not_found:${publicId}`);
  return batch;
});

const organizationMap = new Map<string, { id: string; name: string }>();
for (const batch of batches) {
  for (const event of batch.events) {
    organizationMap.set(event.organizationId, {
      id: event.organizationId,
      name: event.organizationName,
    });
  }
}

const headers = {
  apikey: serviceRoleKey || "dry-run",
  authorization: `Bearer ${serviceRoleKey || "dry-run"}`,
  "content-type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

async function rest(
  table: string,
  method: "POST" | "PATCH",
  body: unknown,
  query = "",
) {
  if (!apply) return;
  const response = await fetch(`${url}/rest/v1/check_di_${table}${query}`, {
    method,
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${table}:${response.status}:${(await response.text()).slice(0, 500)}`);
  }
}

function slugForOrganization(id: string) {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `org-${crypto.randomUUID()}`;
}

function traceEventDraftRow(event: TraceEvent, sequenceNo: number) {
  return {
    id: event.id,
    batch_id: event.batchId,
    sequence_no: sequenceNo,
    stage: event.stage,
    organization_id: event.organizationId,
    organization_name_snapshot: event.organizationName,
    location: event.location,
    occurred_at: event.occurredAt,
    summary: event.summary,
    documents: event.documents ?? [],
    metrics: event.metrics ?? {},
    status: "draft",
    previous_event_hash: null,
    event_hash: null,
    signer_public_key: null,
    signature: null,
    confirmed_at: null,
  };
}

function finalEventPatch(event: TraceEvent) {
  if (event.status === "draft") return null;
  if (!event.previousEventHash || !event.eventHash || !event.signerPublicKey || !event.signature) {
    throw new Error(`confirmed_event_proof_missing:${event.id}`);
  }
  return {
    status: event.status,
    previous_event_hash: event.previousEventHash,
    event_hash: event.eventHash,
    signer_public_key: event.signerPublicKey,
    signature: event.signature,
    confirmed_at: event.occurredAt,
  };
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      storePath,
      publicIds,
      organizations: organizationMap.size,
      batches: batches.length,
      events: batches.reduce((sum, batch) => sum + batch.events.length, 0),
      documentEvidence: batches.reduce(
        (sum, batch) =>
          sum + batch.events.reduce((eventSum, event) => eventSum + (event.documentEvidence?.length ?? 0), 0),
        0,
      ),
      note: apply
        ? "Writing selected Check-Di demo data to namespaced Supabase tables."
        : "Dry-run only. Add --apply after db:doctor succeeds.",
    },
    null,
    2,
  ),
);

if (!apply) process.exit(0);

await rest(
  "organizations",
  "POST",
  [...organizationMap.values()].map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: slugForOrganization(organization.id),
    type: "participant",
  })),
);

await rest(
  "batches",
  "POST",
  batches.map((batch) => ({
    id: batch.id,
    public_id: batch.publicId,
    product_name: batch.productName,
    origin: batch.origin,
  })),
);

for (const batch of batches) {
  for (const [index, event] of batch.events.entries()) {
    await rest("trace_events", "POST", traceEventDraftRow(event, index + 1));

    for (const evidence of event.documentEvidence ?? []) {
      await rest("documents", "POST", {
        id: evidence.id,
        event_id: event.id,
        filename: evidence.filename,
        mime_type: evidence.mimeType,
        size_bytes: evidence.sizeBytes,
        sha256: evidence.sha256,
        storage_backend: "migration-metadata-only",
        storage_path: null,
        uploaded_at: evidence.uploadedAt,
      });

      await rest("document_extractions", "POST", {
        document_id: evidence.id,
        provider: evidence.extraction.provider,
        model: evidence.extraction.model,
        is_simulated: evidence.extraction.simulated,
        status: evidence.extraction.status,
        confidence: evidence.extraction.confidence ?? null,
        extraction: evidence.extraction,
      });
    }

    for (const [checkIndex, validation] of (event.aiValidations ?? []).entries()) {
      await rest("ai_checks", "POST", {
        id: `${event.id}:ai:${checkIndex + 1}`,
        event_id: event.id,
        document_id: validation.sourceDocumentId ?? null,
        status: validation.status,
        message: validation.message,
        fields: validation.fields,
      });
    }

    const finalPatch = finalEventPatch(event);
    if (finalPatch) {
      await rest(
        "trace_events",
        "PATCH",
        finalPatch,
        `?id=eq.${encodeURIComponent(event.id)}`,
      );
    }

    if (event.solanaProof) {
      await rest("integrity_proofs", "POST", {
        id: `proof:${event.id}`,
        event_id: event.id,
        network: event.solanaProof.network,
        kind: event.solanaProof.kind,
        program_id: event.solanaProof.programId,
        status: event.solanaProof.status,
        transaction_signature: event.solanaProof.transactionSignature ?? null,
        slot: event.solanaProof.slot ?? null,
        payer_public_key: event.solanaProof.payerPublicKey ?? null,
        organization_public_key: event.solanaProof.organizationPublicKey ?? null,
        registry_address: event.solanaProof.registryAddress ?? null,
        event_pda: event.solanaProof.eventPda ?? null,
        memo: event.solanaProof.memo ?? null,
        explorer_url: event.solanaProof.explorerUrl ?? null,
        registry_explorer_url: event.solanaProof.registryExplorerUrl ?? null,
        event_explorer_url: event.solanaProof.eventExplorerUrl ?? null,
        anchored_at: event.solanaProof.anchoredAt ?? null,
        attempted_at: event.solanaProof.attemptedAt,
        error: event.solanaProof.error ?? null,
      });
    }
  }
}

console.log(`Migrated ${batches.length} batch(es): ${publicIds.join(", ")}`);
