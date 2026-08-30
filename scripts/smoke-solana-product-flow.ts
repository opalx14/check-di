import { batchRepository } from "../src/lib/db/persistent-store";
import { anchorPersistedTraceEvent } from "../src/lib/solana/anchor-service";
import { verifyTraceEventSolanaProof } from "../src/lib/solana/verification";

const publicId = process.argv[2] ?? "DUR-260830-02";
const batch = await batchRepository.getBatchByPublicId(publicId);
if (!batch) throw new Error(`batch_not_found:${publicId}`);

const confirmed = batch.events.filter((event) => event.status === "confirmed");
const target = confirmed.at(-1);
if (!target) throw new Error(`confirmed_event_not_found:${publicId}`);

const beforeKind = target.solanaProof?.kind ?? "none";
const anchorResult = await anchorPersistedTraceEvent(batch.id, target.id);
const refreshed = await batchRepository.getBatchById(batch.id);
const refreshedEvent = refreshed?.events.find((event) => event.id === target.id);
if (!refreshedEvent) throw new Error("event_missing_after_anchor");

const verification = await verifyTraceEventSolanaProof(
  batch.publicId,
  refreshedEvent,
);

const output = {
  ok:
    anchorResult.anchored &&
    refreshedEvent.solanaProof?.kind === "check-di-registry" &&
    verification.valid,
  publicId: batch.publicId,
  eventId: target.id,
  beforeKind,
  afterKind: refreshedEvent.solanaProof?.kind,
  proof: refreshedEvent.solanaProof,
  verification,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exitCode = 1;
