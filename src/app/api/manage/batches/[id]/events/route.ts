import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";
import type { TraceEvent } from "@/types/evidence";

const VALID_STAGES: TraceEvent["stage"][] = [
  "production",
  "packing",
  "inspection",
  "logistics",
  "retail",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      stage?: TraceEvent["stage"];
      organizationName?: string;
      location?: string;
      occurredAt?: string;
      summary?: string;
      documents?: string[];
      metrics?: Record<string, string | number | boolean>;
    };

    if (!body.stage || !VALID_STAGES.includes(body.stage)) {
      return NextResponse.json({ ok: false, error: "invalid_stage" }, { status: 400 });
    }

    const event = await batchRepository.addDraftEvent(id, {
      stage: body.stage,
      organizationName: body.organizationName ?? "",
      location: body.location ?? "",
      occurredAt: body.occurredAt ?? "",
      summary: body.summary ?? "",
      documents: body.documents,
      metrics: body.metrics,
    });

    return NextResponse.json({ ok: true, event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "batch_not_found" ? 404 : message === "draft_event_exists" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
