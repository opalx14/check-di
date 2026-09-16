import { NextResponse } from "next/server";

import {
  CheckDiAuthError,
  resolveCheckDiOrganizationActor,
} from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const actor = await resolveCheckDiOrganizationActor(request, ["owner", "operator"]);
    const body = (await request.json()) as {
      productName?: string;
      origin?: string;
      publicId?: string;
    };

    const batch = await batchRepository.createBatch({
      productName: body.productName ?? "",
      origin: body.origin ?? "",
      publicId: body.publicId,
      createdByOrganizationId: actor.membership?.organizationId,
    });

    return NextResponse.json(
      {
        ok: true,
        batch,
        links: {
          manage: `/batches/${batch.id}`,
          verify: `/verify/${batch.publicId}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "public_id_exists" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
