import { batchRepository } from "@/lib/db";
import { verifyEventRegistryOnDevnet } from "@/lib/solana/registry";

const batches = await batchRepository.listBatches();
const rows: Array<Record<string, unknown>> = [];
let invalid = 0;
let missingMirror = 0;

for (const batch of batches) {
  for (const event of batch.events) {
    if (
      !event.eventHash ||
      !event.signerPublicKey ||
      !["confirmed", "revoked", "superseded"].includes(event.status)
    ) {
      continue;
    }

    // SPL Memo is a legacy fallback and has no Event PDA to reconcile.
    if (event.solanaProof?.kind === "spl-memo") continue;

    const authorityPublicKey = event.solanaProof?.payerPublicKey;
    const verification = await verifyEventRegistryOnDevnet(
      batch.publicId,
      event,
      authorityPublicKey ? { authorityPublicKey } : undefined,
    );

    const mirrorPresent =
      event.solanaProof?.kind === "check-di-registry" &&
      event.solanaProof.status === "confirmed";
    const liveValid = verification.valid === true;

    if (liveValid && !mirrorPresent) missingMirror += 1;
    if (mirrorPresent && !liveValid) invalid += 1;

    if (!liveValid || !mirrorPresent) {
      rows.push({
        publicId: batch.publicId,
        batchId: batch.id,
        eventId: event.id,
        stage: event.stage,
        lifecycleStatus: event.status,
        mirrorPresent,
        liveValid,
        eventPda:
          "eventPda" in verification ? verification.eventPda : event.solanaProof?.eventPda,
        error: "error" in verification ? verification.error : undefined,
        action:
          liveValid && !mirrorPresent
            ? "needs_mirror_sync"
            : mirrorPresent && !liveValid
              ? "investigate_live_mismatch"
              : "proof_not_found",
      });
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: invalid === 0,
      mode: "read-only",
      checkedBatches: batches.length,
      issues: rows.length,
      missingMirror,
      invalidMirror: invalid,
      rows,
      note:
        "Read-only reconciliation never creates or fabricates a proof. Review live RPC evidence before any DB mirror repair.",
    },
    null,
    2,
  ),
);

if (invalid > 0) process.exitCode = 1;
