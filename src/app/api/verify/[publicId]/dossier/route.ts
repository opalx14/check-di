import { NextResponse } from "next/server";

import { buildAuditDossier } from "@/lib/audit/dossier";
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

  const devnetEvents = await Promise.all(
    batch.events.map(async (event) => ({
      eventId: event.id,
      stage: event.stage,
      verification: await verifyTraceEventOnDevnetIndependent(
        batch.publicId,
        event,
      ),
    })),
  );

  const dossier = buildAuditDossier({
    batch,
    devnetEvents,
  });

  const safePublicId = batch.publicId.replace(/[^A-Z0-9-]/gi, "-");

  return new NextResponse(`${JSON.stringify(dossier, null, 2)}\n`, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="check-di-${safePublicId}-audit-dossier.json"`,
      "cache-control": "no-store, max-age=0",
    },
  });
}
