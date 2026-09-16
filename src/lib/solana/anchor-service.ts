import { batchRepository } from "@/lib/db";
import { CHECK_DI_REGISTRY_PROGRAM_ID } from "@/lib/solana/config";
import {
  appendEventRegistryOnDevnet,
  getRegistryExplorerUrl,
  getRegistryTransactionExplorerUrl,
  initializeBatchRegistryOnDevnet,
  verifyEventRegistryOnDevnet,
} from "@/lib/solana/registry";
import {
  anchorTraceEventOnDevnet,
  getDevnetFeePayerAddress,
} from "@/lib/solana/server";
import type { SolanaIntegrityProof, TraceEvent } from "@/types/evidence";

function registryProofFromResult({
  appendResult,
  attemptedAt,
}: {
  appendResult: Awaited<ReturnType<typeof appendEventRegistryOnDevnet>>;
  attemptedAt: string;
}): SolanaIntegrityProof {
  const transactionSignature = appendResult.transactionSignature;
  const anchoredAt = new Date(
    appendResult.state.anchoredAt * 1000,
  ).toISOString();

  return {
    network: "devnet",
    kind: "check-di-registry",
    programId: CHECK_DI_REGISTRY_PROGRAM_ID,
    status: "confirmed",
    transactionSignature,
    payerPublicKey: appendResult.state.authority,
    organizationPublicKey: appendResult.organization.toString(),
    registryAddress: appendResult.registry.toString(),
    eventPda: appendResult.event.toString(),
    explorerUrl: transactionSignature
      ? getRegistryTransactionExplorerUrl(transactionSignature)
      : getRegistryExplorerUrl(appendResult.event.toString()),
    registryExplorerUrl: getRegistryExplorerUrl(
      appendResult.registry.toString(),
    ),
    eventExplorerUrl: getRegistryExplorerUrl(appendResult.event.toString()),
    anchoredAt,
    attemptedAt,
  };
}

async function anchorConfirmedChainThroughTarget(
  batchId: string,
  publicId: string,
  events: TraceEvent[],
  targetEventId: string,
) {
  await initializeBatchRegistryOnDevnet(publicId);

  const targetIndex = events.findIndex((event) => event.id === targetEventId);
  if (targetIndex === -1) throw new Error("event_not_found");

  let targetEvent: TraceEvent | undefined;
  let targetReused = false;

  for (const event of events.slice(0, targetIndex + 1)) {
    if (event.status === "revoked" || event.status === "superseded") {
      const verification = await verifyEventRegistryOnDevnet(publicId, event);
      if (!verification.valid) {
        throw new Error(
          verification.error ?? "registry_terminal_event_verification_failed",
        );
      }
      continue;
    }

    const attemptedAt = new Date().toISOString();
    const appendResult = await appendEventRegistryOnDevnet(publicId, event);
    const verification = await verifyEventRegistryOnDevnet(publicId, event);
    if (!verification.valid) {
      throw new Error(
        verification.error ?? "registry_live_verification_failed",
      );
    }

    const proof = registryProofFromResult({ appendResult, attemptedAt });
    const persisted = await batchRepository.setSolanaProof(
      batchId,
      event.id,
      proof,
    );

    if (event.id === targetEventId) {
      targetEvent = persisted;
      targetReused = appendResult.reused;
    }
  }

  if (!targetEvent) throw new Error("event_not_found_after_registry_anchor");
  return { event: targetEvent, reused: targetReused };
}

export async function anchorPersistedTraceEvent(batchId: string, eventId: string) {
  const batch = await batchRepository.getBatchById(batchId);
  if (!batch) throw new Error("batch_not_found");

  const event = batch.events.find((item) => item.id === eventId);
  if (!event) throw new Error("event_not_found");
  if (event.status !== "confirmed") throw new Error("event_not_confirmed");

  if (
    event.solanaProof?.kind === "check-di-registry" &&
    event.solanaProof.status === "confirmed" &&
    event.solanaProof.eventPda
  ) {
    const verification = await verifyEventRegistryOnDevnet(batch.publicId, event);
    if (verification.valid) {
      return {
        event,
        anchored: true as const,
        reused: true as const,
        proofKind: "check-di-registry" as const,
      };
    }
  }

  const confirmedEvents = batch.events.filter(
    (item) => item.status !== "draft",
  );

  try {
    const registryResult = await anchorConfirmedChainThroughTarget(
      batchId,
      batch.publicId,
      confirmedEvents,
      eventId,
    );
    return {
      event: registryResult.event,
      anchored: true as const,
      reused: registryResult.reused,
      proofKind: "check-di-registry" as const,
    };
  } catch (registryError) {
    const registryMessage =
      registryError instanceof Error
        ? registryError.message
        : "registry_anchor_failed";

    try {
      if (
        event.solanaProof?.kind === "spl-memo" &&
        event.solanaProof.status === "confirmed" &&
        event.solanaProof.transactionSignature
      ) {
        return {
          event,
          anchored: true as const,
          reused: true as const,
          fallback: true as const,
          proofKind: "spl-memo" as const,
          registryError: registryMessage,
        };
      }

      const memoProof = await anchorTraceEventOnDevnet({
        publicId: batch.publicId,
        event,
      });
      const persisted = await batchRepository.setSolanaProof(
        batchId,
        eventId,
        memoProof,
      );
      return {
        event: persisted,
        anchored: true as const,
        reused: false as const,
        fallback: true as const,
        proofKind: "spl-memo" as const,
        registryError: registryMessage,
      };
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : "solana_memo_fallback_failed";
      let payerPublicKey: string | undefined;
      try {
        payerPublicKey = await getDevnetFeePayerAddress();
      } catch {
        payerPublicKey = undefined;
      }

      const attemptedAt = new Date().toISOString();
      const failedProof: SolanaIntegrityProof = {
        network: "devnet",
        kind: "check-di-registry",
        programId: CHECK_DI_REGISTRY_PROGRAM_ID,
        status: "failed",
        payerPublicKey,
        attemptedAt,
        error: `registry:${registryMessage};fallback:${fallbackMessage}`,
      };

      const persisted = await batchRepository.setSolanaProof(
        batchId,
        eventId,
        failedProof,
      );
      return {
        event: persisted,
        anchored: false as const,
        reused: false as const,
        proofKind: "check-di-registry" as const,
        error: failedProof.error,
      };
    }
  }
}
