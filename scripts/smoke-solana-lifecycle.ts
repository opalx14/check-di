import {
  appendEventRegistryOnDevnet,
  getEventRegistryStateOnDevnet,
  initializeBatchRegistryOnDevnet,
  setEventRegistryStatusOnDevnet,
  verifyEventRegistryOnDevnet,
} from "@/lib/solana/registry";
import { confirmTraceEvent } from "@/lib/traceability/server";

const publicId = "CHECK-DI-LIFECYCLE-SMOKE-01";
const confirmed = confirmTraceEvent(
  {
    id: "evt-lifecycle-live-smoke-01",
    batchId: "batch-lifecycle-live-smoke-01",
    stage: "inspection",
    organizationId: "org-lifecycle-live-smoke",
    organizationName: "Check-Di Lifecycle Smoke Organization",
    location: "Devnet",
    occurredAt: "2026-08-31T15:45:00.000Z",
    summary: "Stable live smoke for revoke lifecycle.",
    documents: [],
    metrics: {},
    aiValidations: [],
  },
  "GENESIS",
);

await initializeBatchRegistryOnDevnet(publicId);
let state = await getEventRegistryStateOnDevnet(publicId, confirmed);
let transactionSignature: string | undefined;

if (!state) {
  await appendEventRegistryOnDevnet(publicId, confirmed);
  state = await getEventRegistryStateOnDevnet(publicId, confirmed);
}
if (!state) throw new Error("lifecycle_smoke_event_missing");

if (state.status === "active") {
  const result = await setEventRegistryStatusOnDevnet(
    publicId,
    confirmed,
    "revoked",
  );
  transactionSignature = result.transactionSignature;
  state = result.state;
}

if (state.status !== "revoked") {
  throw new Error(`lifecycle_smoke_expected_revoked:${state.status}`);
}

const revokedEvent = { ...confirmed, status: "revoked" as const };
const verification = await verifyEventRegistryOnDevnet(publicId, revokedEvent);

console.log(
  JSON.stringify(
    {
      ok: verification.valid,
      publicId,
      status: state.status,
      transactionSignature,
      registry: verification.registry,
      eventPda: verification.eventPda,
      checks: verification.checks,
      reused: !transactionSignature,
    },
    null,
    2,
  ),
);

if (!verification.valid) process.exitCode = 1;
