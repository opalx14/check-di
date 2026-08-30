import { batchRepository } from "@/lib/db/persistent-store";
import {
  appendEventRegistryOnDevnet,
  getBatchRegistryHash,
  getBatchRegistryStateOnDevnet,
  getOrganizationHash,
  initializeBatchRegistryOnDevnet,
  verifyEventRegistryOnDevnet,
} from "@/lib/solana/registry";

const publicId = process.argv[2] ?? "DUR-260830-02";
const batch = await batchRepository.getPublicProof(publicId);

if (!batch) throw new Error(`batch_not_found:${publicId}`);
const event = batch.events[0];
if (!event) throw new Error(`batch_has_no_confirmed_event:${publicId}`);

const initialized = await initializeBatchRegistryOnDevnet(batch.publicId);
const appended = await appendEventRegistryOnDevnet(batch.publicId, event);
const liveBatchState = await getBatchRegistryStateOnDevnet(batch.publicId);
const liveVerification = await verifyEventRegistryOnDevnet(batch.publicId, event);

const expectedBatchHash = getBatchRegistryHash(batch.publicId).toString("hex");
const expectedOrganizationHash = getOrganizationHash(event.organizationId).toString("hex");

const verification = {
  batchHashMatches: initialized.state.batchHash === expectedBatchHash,
  eventCountIsOneOrMore: (liveBatchState?.eventCount ?? 0) >= 1,
  chainHeadMatches: liveBatchState?.lastEventHash === event.eventHash,
  eventHashMatches: appended.state.eventHash === event.eventHash,
  previousHashMatches:
    event.previousEventHash === "GENESIS"
      ? appended.state.previousEventHash === "0".repeat(64)
      : appended.state.previousEventHash === event.previousEventHash,
  organizationHashMatches:
    appended.state.organizationHash === expectedOrganizationHash,
  registryLinkMatches: appended.state.registry === initialized.registry,
  liveRpcVerification: liveVerification.valid,
};

if (Object.values(verification).some((value) => !value)) {
  throw new Error(`registry_verification_failed:${JSON.stringify(verification)}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      publicId: batch.publicId,
      program: "check_di_registry",
      batch: {
        registry: initialized.registry,
        transactionSignature: initialized.transactionSignature,
        reused: initialized.reused,
        state: liveBatchState ?? initialized.state,
      },
      event: {
        eventId: event.id,
        eventPda: appended.event,
        organization: appended.organization,
        transactionSignature: appended.transactionSignature,
        reused: appended.reused,
        state: appended.state,
      },
      verification,
      liveVerification,
    },
    null,
    2,
  ),
);
