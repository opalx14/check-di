import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const batch = await batchRepository.getBatchById(id);

  if (!batch) {
    return NextResponse.json({ ok: false, error: "batch_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, batch });
}
