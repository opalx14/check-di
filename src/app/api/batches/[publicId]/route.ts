import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";
import { verifySolanaIntegrityProof } from "@/lib/solana/server";

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
      ...(await verifySolanaIntegrityProof(event.solanaProof)),
      transactionSignature: event.solanaProof?.transactionSignature,
      explorerUrl: event.solanaProof?.explorerUrl,
    })),
  );
  const anchoredEvents = solanaChecks.filter((check) => check.valid).length;

  return NextResponse.json({
    ok: true,
    batch,
    proof: {
      type: "off-chain-ed25519-hash-chain+solana-memo-anchor",
      persistence: "local-file",
      solanaAnchored: anchoredEvents > 0,
      allConfirmedEventsAnchored:
        batch.events.length > 0 && anchoredEvents === batch.events.length,
      anchoredEvents,
      confirmedEvents: batch.events.length,
      solanaChecks,
    },
  });
}
