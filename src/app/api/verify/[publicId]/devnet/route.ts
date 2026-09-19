import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db";
import { verifyTraceEventOnDevnetIndependent } from "@/lib/solana/verification";

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

  const events = await Promise.all(
    batch.events.map(async (event) => ({
      eventId: event.id,
      stage: event.stage,
      eventHash: event.eventHash,
      ...(await verifyTraceEventOnDevnetIndependent(batch.publicId, event)),
    })),
  );

  const verifiedEvents = events.filter((event) => event.valid).length;
  const registryEvents = events.filter(
    (event) => event.kind === "check-di-registry",
  ).length;

  return NextResponse.json(
    {
      ok: true,
      verifier: {
        mode: "fresh-devnet-rpc",
        network: "devnet",
        persistedMirrorTrusted: false,
        verifiedAt: new Date().toISOString(),
      },
      batch: {
        publicId: batch.publicId,
        eventCount: batch.events.length,
      },
      summary: {
        verifiedEvents,
        registryEvents,
        allRegistryEventsVerified:
          registryEvents > 0 && verifiedEvents === registryEvents,
      },
      events,
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}
