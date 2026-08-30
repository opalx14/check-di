import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const batch = await batchRepository.getPublicProof(publicId);

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
      type: "off-chain-ed25519-hash-chain",
      persistence: "local-file",
      solanaAnchored: false,
    },
  });
}
