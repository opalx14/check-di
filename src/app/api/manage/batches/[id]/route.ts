import { NextResponse } from "next/server";

import { authorizeManagedBatchRequest } from "@/lib/auth/authorization";
import { CheckDiAuthError } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { batch } = await authorizeManagedBatchRequest(request, id, [
      "owner",
      "operator",
      "inspector",
      "viewer",
    ]);
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: message === "batch_not_found" ? 404 : 400 },
    );
  }
}
