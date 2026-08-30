import { CHECK_DI_REGISTRY_PROGRAM_ID } from "@/lib/solana/config";
import { verifyEventRegistryOnDevnet } from "@/lib/solana/registry";
import {
  verifySolanaIntegrityProof as verifyMemoIntegrityProof,
  type SolanaAnchorVerification,
} from "@/lib/solana/server";
import type { TraceEvent } from "@/types/evidence";

export type SolanaProofVerification = SolanaAnchorVerification & {
  kind?: "check-di-registry" | "spl-memo";
  registryAddress?: string;
  eventPda?: string;
  organizationPublicKey?: string;
};

export async function verifyTraceEventSolanaProof(
  publicId: string,
  event: TraceEvent,
): Promise<SolanaProofVerification> {
  const proof = event.solanaProof;
  if (!proof || proof.status !== "confirmed") {
    return { valid: false, error: "solana_anchor_missing" };
  }

  if (proof.kind === "spl-memo") {
    return {
      ...(await verifyMemoIntegrityProof(proof)),
      kind: "spl-memo",
    };
  }

  if (proof.programId !== CHECK_DI_REGISTRY_PROGRAM_ID) {
    return {
      valid: false,
      kind: "check-di-registry",
      error: "registry_program_id_mismatch",
    };
  }

  if (!proof.payerPublicKey) {
    return {
      valid: false,
      kind: "check-di-registry",
      error: "registry_authority_missing",
    };
  }

  const live = await verifyEventRegistryOnDevnet(publicId, event, {
    authorityPublicKey: proof.payerPublicKey,
  });
  const registryAddress = live.registry?.toString();
  const eventPda = live.eventPda?.toString();
  const organizationPublicKey = live.organization?.toString();

  const persistedMetadataMatches =
    (!proof.registryAddress || proof.registryAddress === registryAddress) &&
    (!proof.eventPda || proof.eventPda === eventPda) &&
    (!proof.organizationPublicKey ||
      proof.organizationPublicKey === organizationPublicKey);

  return {
    valid: live.valid && persistedMetadataMatches,
    kind: "check-di-registry",
    registryAddress,
    eventPda,
    organizationPublicKey,
    error: live.valid
      ? persistedMetadataMatches
        ? undefined
        : "registry_persisted_metadata_mismatch"
      : live.error ?? "registry_live_verification_failed",
  };
}
