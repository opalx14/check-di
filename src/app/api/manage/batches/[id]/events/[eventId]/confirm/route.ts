import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";
import { anchorPersistedTraceEvent } from "@/lib/solana/anchor-service";
import { isSolanaAutoAnchorEnabled } from "@/lib/solana/server";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; eventId: string }>;
  },
) {
  try {
    const { id, eventId } = await params;
    const confirmedEvent = await batchRepository.confirmEvent(id, eventId);

    if (!isSolanaAutoAnchorEnabled()) {
      return NextResponse.json({
        ok: true,
        event: confirmedEvent,
        solana: { anchored: false, skipped: true },
      });
    }

    const anchorResult = await anchorPersistedTraceEvent(id, eventId);
    return NextResponse.json({
      ok: true,
      event: anchorResult.event,
      solana: {
        anchored: anchorResult.anchored,
        reused: anchorResult.reused,
        error: "error" in anchorResult ? anchorResult.error : undefined,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "batch_not_found" || message === "event_not_found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
