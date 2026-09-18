import { NextResponse } from "next/server";

import {
  CheckDiAuthError,
  organizationActorCanAccessBatch,
  resolveCheckDiOrganizationActor,
} from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import {
  fingerprintIdempotentRequest,
  getIdempotencyKey,
  runIdempotent,
} from "@/lib/reliability/idempotency";
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
    const actor = await resolveCheckDiOrganizationActor(request, [
      "owner",
      "operator",
      "inspector",
    ]);
    const batch = await batchRepository.getBatchById(id);
    if (!batch) {
      return NextResponse.json({ ok: false, error: "batch_not_found" }, { status: 404 });
    }
    if (actor.context && !organizationActorCanAccessBatch(actor, batch)) {
      return NextResponse.json(
        { ok: false, error: "organization_forbidden" },
        { status: 403 },
      );
    }

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

    const input = {
      stage: body.stage,
      organizationId: actor.membership?.organizationId,
      organizationName:
        actor.membership?.organizationName ?? body.organizationName ?? "",
      location: body.location ?? "",
      occurredAt: body.occurredAt ?? "",
      summary: body.summary ?? "",
      documents: body.documents,
      metrics: body.metrics,
    };
    const idempotency = await runIdempotent({
      scope: `create-event:${actor.context?.user.id ?? "anonymous"}:${id}`,
      key: getIdempotencyKey(request),
      fingerprint: fingerprintIdempotentRequest(input),
      operation: () => batchRepository.addDraftEvent(id, input),
    });
    const event = idempotency.value;

    return NextResponse.json(
      { ok: true, event },
      {
        status: 201,
        headers: {
          "x-idempotency-replayed": idempotency.replayed ? "true" : "false",
        },
      },
    );
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "batch_not_found"
        ? 404
        : message === "draft_event_exists" ||
            message === "idempotency_key_reused_with_different_request"
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
