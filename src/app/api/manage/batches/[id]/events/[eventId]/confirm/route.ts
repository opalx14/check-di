import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";

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
    const event = await batchRepository.confirmEvent(id, eventId);

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "batch_not_found" || message === "event_not_found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
