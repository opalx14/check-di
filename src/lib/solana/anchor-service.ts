import { batchRepository } from "@/lib/db/persistent-store";
import {
  anchorTraceEventOnDevnet,
  getDevnetFeePayerAddress,
  SOLANA_MEMO_PROGRAM_ID,
} from "@/lib/solana/server";
import type { SolanaIntegrityProof } from "@/types/evidence";

export async function anchorPersistedTraceEvent(batchId: string, eventId: string) {
  const batch = await batchRepository.getBatchById(batchId);
  if (!batch) throw new Error("batch_not_found");

  const event = batch.events.find((item) => item.id === eventId);
  if (!event) throw new Error("event_not_found");
  if (event.status !== "confirmed") throw new Error("event_not_confirmed");

  if (event.solanaProof?.status === "confirmed" && event.solanaProof.transactionSignature) {
    return { event, anchored: true as const, reused: true as const };
  }

  try {
    const proof = await anchorTraceEventOnDevnet({ publicId: batch.publicId, event });
    const persisted = await batchRepository.setSolanaProof(batchId, eventId, proof);
    return { event: persisted, anchored: true as const, reused: false as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "solana_anchor_failed";
    let payerPublicKey: string | undefined;
    try {
      payerPublicKey = await getDevnetFeePayerAddress();
    } catch {
      payerPublicKey = undefined;
    }

    const attemptedAt = new Date().toISOString();
    const failedProof: SolanaIntegrityProof = {
      network: "devnet",
      kind: "spl-memo",
      programId: SOLANA_MEMO_PROGRAM_ID,
      status: "failed",
      payerPublicKey,
      attemptedAt,
      error: message,
    };

    const persisted = await batchRepository.setSolanaProof(batchId, eventId, failedProof);
    return {
      event: persisted,
      anchored: false as const,
      reused: false as const,
      error: message,
    };
  }
}
