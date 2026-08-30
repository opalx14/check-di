import { NextResponse } from "next/server";

import { anchorPersistedTraceEvent } from "@/lib/solana/anchor-service";

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
    const result = await anchorPersistedTraceEvent(id, eventId);

    return NextResponse.json({
      ok: result.anchored,
      event: result.event,
      solana: {
        anchored: result.anchored,
        reused: result.reused,
        error: "error" in result ? result.error : undefined,
      },
    }, { status: result.anchored ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "batch_not_found" || message === "event_not_found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
