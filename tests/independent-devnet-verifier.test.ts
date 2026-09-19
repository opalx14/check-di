import { describe, expect, test } from "bun:test";

import { CHECK_DI_REGISTRY_PROGRAM_ID } from "@/lib/solana/config";
import { getIndependentDevnetEligibility } from "@/lib/solana/verification";
import type { TraceEvent } from "@/types/evidence";

function eventWithProof(
  proof?: TraceEvent["solanaProof"],
): TraceEvent {
  return {
    id: "evt-independent-test",
    batchId: "batch-independent-test",
    stage: "production",
    organizationId: "org-independent-test",
    organizationName: "HTX Test",
    location: "Long An",
    occurredAt: "2026-09-19T00:00:00.000Z",
    summary: "Test event",
    status: "confirmed",
    eventHash: "1".repeat(64),
    previousEventHash: "GENESIS",
    signerPublicKey: "11111111111111111111111111111111",
    solanaProof: proof,
  };
}

describe("independent Devnet verifier preflight", () => {
  test("requires a confirmed Registry proof", () => {
    expect(getIndependentDevnetEligibility(eventWithProof())).toEqual({
      eligible: false,
      error: "solana_anchor_missing",
    });

    expect(
      getIndependentDevnetEligibility(
        eventWithProof({
          network: "devnet",
          kind: "spl-memo",
          programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
          status: "confirmed",
          attemptedAt: "2026-09-19T00:00:00.000Z",
        }),
      ),
    ).toEqual({
      eligible: false,
      error: "independent_registry_verifier_requires_registry_proof",
    });
  });

  test("rejects a different Registry program or missing public authority", () => {
    expect(
      getIndependentDevnetEligibility(
        eventWithProof({
          network: "devnet",
          kind: "check-di-registry",
          programId: "11111111111111111111111111111111",
          status: "confirmed",
          attemptedAt: "2026-09-19T00:00:00.000Z",
          payerPublicKey: "g83EX9BBPEmjv1fRwdeRcZVvA8EdhMsqDe3W1Cta8ai",
        }),
      ),
    ).toEqual({
      eligible: false,
      error: "registry_program_id_mismatch",
    });

    expect(
      getIndependentDevnetEligibility(
        eventWithProof({
          network: "devnet",
          kind: "check-di-registry",
          programId: CHECK_DI_REGISTRY_PROGRAM_ID,
          status: "confirmed",
          attemptedAt: "2026-09-19T00:00:00.000Z",
        }),
      ),
    ).toEqual({
      eligible: false,
      error: "registry_authority_missing",
    });
  });

  test("accepts only public inputs needed for a fresh Devnet read", () => {
    const authorityPublicKey =
      "g83EX9BBPEmjv1fRwdeRcZVvA8EdhMsqDe3W1Cta8ai";

    expect(
      getIndependentDevnetEligibility(
        eventWithProof({
          network: "devnet",
          kind: "check-di-registry",
          programId: CHECK_DI_REGISTRY_PROGRAM_ID,
          status: "confirmed",
          attemptedAt: "2026-09-19T00:00:00.000Z",
          payerPublicKey: authorityPublicKey,
          registryAddress: "persisted-address-is-not-trusted",
          eventPda: "persisted-event-pda-is-not-trusted",
        }),
      ),
    ).toEqual({
      eligible: true,
      authorityPublicKey,
    });
  });
});
