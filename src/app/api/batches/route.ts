import { NextResponse } from "next/server";

import {
  CheckDiAuthError,
  resolveCheckDiOrganizationActor,
} from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import {
  fingerprintIdempotentRequest,
  getIdempotencyKey,
  runIdempotent,
} from "@/lib/reliability/idempotency";

export async function POST(request: Request) {
  try {
    const actor = await resolveCheckDiOrganizationActor(request, ["owner", "operator"]);
    const body = (await request.json()) as {
      productName?: string;
      origin?: string;
      publicId?: string;
    };

    if (actor.context && !actor.membership?.walletPublicKey) {
      return NextResponse.json(
        { ok: false, error: "organization_wallet_required" },
        { status: 409 },
      );
    }

    const input = {
      productName: body.productName ?? "",
      origin: body.origin ?? "",
      publicId: body.publicId,
      createdByOrganizationId: actor.membership?.organizationId,
    };
    const idempotency = await runIdempotent({
      scope: `create-batch:${actor.context?.user.id ?? "anonymous"}`,
      key: getIdempotencyKey(request),
      fingerprint: fingerprintIdempotentRequest(input),
      operation: () => batchRepository.createBatch(input),
    });
    const batch = idempotency.value;

    return NextResponse.json(
      {
        ok: true,
        batch,
        links: {
          manage: `/batches/${batch.id}`,
          verify: `/verify/${batch.publicId}`,
        },
      },
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
      message === "public_id_exists" ||
      message === "idempotency_key_reused_with_different_request"
        ? 409
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
