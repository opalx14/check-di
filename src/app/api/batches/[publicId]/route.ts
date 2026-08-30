import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";
import { verifyTraceEventSolanaProof } from "@/lib/solana/verification";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const batch = await batchRepository.getPublicProof(publicId);

  if (!batch) {
    return NextResponse.json(
      { ok: false, error: "batch_not_found" },
      { status: 404 },
    );
  }

  const solanaChecks = await Promise.all(
    batch.events.map(async (event) => ({
      eventId: event.id,
      ...(await verifyTraceEventSolanaProof(batch.publicId, event)),
      proofKind: event.solanaProof?.kind,
      transactionSignature: event.solanaProof?.transactionSignature,
      registryAddress: event.solanaProof?.registryAddress,
      eventPda: event.solanaProof?.eventPda,
      explorerUrl: event.solanaProof?.explorerUrl,
    })),
  );
  const anchoredEvents = solanaChecks.filter((check) => check.valid).length;

  return NextResponse.json({
    ok: true,
    batch,
    proof: {
      type: "off-chain-ed25519-hash-chain+check-di-registry-pda",
      persistence: "local-file",
      solanaAnchored: anchoredEvents > 0,
      allConfirmedEventsAnchored:
        batch.events.length > 0 && anchoredEvents === batch.events.length,
      anchoredEvents,
      registryAnchoredEvents: solanaChecks.filter(
        (check) => check.valid && check.kind === "check-di-registry",
      ).length,
      memoFallbackEvents: solanaChecks.filter(
        (check) => check.valid && check.kind === "spl-memo",
      ).length,
      confirmedEvents: batch.events.length,
      solanaChecks,
    },
  });
}
