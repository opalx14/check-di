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

export type IndependentDevnetVerification = SolanaProofVerification & {
  source: "solana-devnet-rpc";
  persistedMirrorTrusted: false;
  checks?: Record<string, boolean>;
  registryStatus?: string;
  eventStatus?: string;
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

/**
 * Fresh public verification path that derives Registry/Event PDAs from public
 * inputs and reads Solana Devnet directly. Persisted registry/event addresses
 * are not trusted when deciding whether the proof is valid.
 */
export function getIndependentDevnetEligibility(event: TraceEvent) {
  const proof = event.solanaProof;
  if (!proof || proof.status !== "confirmed") {
    return { eligible: false as const, error: "solana_anchor_missing" };
  }
  if (proof.kind !== "check-di-registry") {
    return {
      eligible: false as const,
      error: "independent_registry_verifier_requires_registry_proof",
    };
  }
  if (proof.programId !== CHECK_DI_REGISTRY_PROGRAM_ID) {
    return {
      eligible: false as const,
      error: "registry_program_id_mismatch",
    };
  }
  if (!proof.payerPublicKey) {
    return { eligible: false as const, error: "registry_authority_missing" };
  }
  return {
    eligible: true as const,
    authorityPublicKey: proof.payerPublicKey,
  };
}

export async function verifyTraceEventOnDevnetIndependent(
  publicId: string,
  event: TraceEvent,
): Promise<IndependentDevnetVerification> {
  const proof = event.solanaProof;
  const base = {
    source: "solana-devnet-rpc" as const,
    persistedMirrorTrusted: false as const,
  };
  const eligibility = getIndependentDevnetEligibility(event);

  if (!eligibility.eligible) {
    return {
      ...base,
      valid: false,
      kind: proof?.kind,
      error: eligibility.error,
    };
  }

  const live = await verifyEventRegistryOnDevnet(publicId, event, {
    authorityPublicKey: eligibility.authorityPublicKey,
  });

  return {
    ...base,
    valid: live.valid,
    kind: "check-di-registry",
    registryAddress: live.registry?.toString(),
    eventPda: live.eventPda?.toString(),
    organizationPublicKey: live.organization?.toString(),
    checks: live.checks,
    registryStatus: live.registryState?.status,
    eventStatus: live.eventState?.status,
    error: live.valid
      ? undefined
      : live.error ?? "registry_live_verification_failed",
  };
}
