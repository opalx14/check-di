import { NextResponse } from "next/server";

import { authorizeManagedEventRequest } from "@/lib/auth/authorization";
import { CheckDiAuthError } from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import { setEventRegistryStatusOnDevnet } from "@/lib/solana/registry";

const LIFECYCLE_ROLES = ["owner", "operator"] as const;
const VALID_STATUSES = ["revoked", "superseded"] as const;
type LifecycleStatus = (typeof VALID_STATUSES)[number];

function isLifecycleStatus(value: unknown): value is LifecycleStatus {
  return VALID_STATUSES.includes(value as LifecycleStatus);
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; eventId: string }>;
  },
) {
  try {
    const { id, eventId } = await params;
    const { batch, event } = await authorizeManagedEventRequest(
      request,
      id,
      eventId,
      LIFECYCLE_ROLES,
    );
    const body = (await request.json().catch(() => ({}))) as {
      status?: LifecycleStatus;
    };
    if (!isLifecycleStatus(body.status)) {
      return NextResponse.json(
        { ok: false, error: "invalid_lifecycle_status" },
        { status: 400 },
      );
    }
    if (event.status !== "confirmed") {
      return NextResponse.json(
        { ok: false, error: "event_status_transition_invalid" },
        { status: 409 },
      );
    }
    if (
      event.solanaProof?.status !== "confirmed" ||
      event.solanaProof.kind !== "check-di-registry"
    ) {
      return NextResponse.json(
        { ok: false, error: "registry_proof_required_for_lifecycle" },
        { status: 409 },
      );
    }

    const chainResult = await setEventRegistryStatusOnDevnet(
      batch.publicId,
      event,
      body.status,
    );
    const updatedEvent = await batchRepository.setEventStatus(
      id,
      eventId,
      body.status,
    );

    return NextResponse.json({
      ok: true,
      event: updatedEvent,
      lifecycle: {
        status: body.status,
        transactionSignature: chainResult.transactionSignature,
        registryAddress: chainResult.registry,
        eventPda: chainResult.event,
      },
    });
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "batch_not_found" || message === "event_not_found"
        ? 404
        : message === "registry_event_not_active" ||
            message === "event_status_transition_invalid"
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
