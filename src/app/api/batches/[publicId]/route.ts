import { NextResponse } from "next/server";

import { getSampleBatch } from "@/lib/db/sample-batch";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const batch = getSampleBatch(publicId);

  if (!batch) {
    return NextResponse.json(
      { ok: false, error: "batch_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    batch,
    proof: {
      type: "off-chain-demo-ed25519-hash-chain",
      solanaAnchored: false,
    },
  });
}
