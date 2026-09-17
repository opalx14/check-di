import { NextResponse } from "next/server";

import {
  CheckDiAuthError,
  resolveCheckDiOrganizationActor,
} from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const actor = await resolveCheckDiOrganizationActor(request, [
      "owner",
      "operator",
      "inspector",
      "viewer",
    ]);

    if (!actor.membership) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const organizationId = actor.membership.organizationId;
    const batches = (await batchRepository.listBatches())
      .filter(
        (batch) =>
          batch.createdByOrganizationId === organizationId ||
          batch.events.some((event) => event.organizationId === organizationId),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return NextResponse.json({
      ok: true,
      organization: {
        id: organizationId,
        name: actor.membership.organizationName,
        role: actor.membership.role,
        walletPublicKey: actor.membership.walletPublicKey,
      },
      batches,
    });
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
