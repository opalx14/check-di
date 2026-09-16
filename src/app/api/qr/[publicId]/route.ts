import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const batch = await batchRepository.getPublicProof(publicId);

  if (!batch || batch.events.length === 0) {
    return NextResponse.json(
      { ok: false, error: "batch_proof_not_available" },
      { status: 404 },
    );
  }

  const verifyUrl = new URL(
    `/verify/${encodeURIComponent(batch.publicId)}`,
    request.url,
  ).toString();
  const providerUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
  providerUrl.searchParams.set("size", "320x320");
  providerUrl.searchParams.set("format", "svg");
  providerUrl.searchParams.set("data", verifyUrl);

  return NextResponse.redirect(providerUrl, 307);
}
