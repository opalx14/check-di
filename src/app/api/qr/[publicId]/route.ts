import { NextResponse } from "next/server";

import { getSampleBatch } from "@/lib/db/sample-batch";

export async function GET(
  request: Request,
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

  const verifyUrl = new URL(`/verify/${encodeURIComponent(publicId)}`, request.url).toString();
  const providerUrl = new URL("https://api.qrserver.com/v1/create-qr-code/");
  providerUrl.searchParams.set("size", "320x320");
  providerUrl.searchParams.set("format", "svg");
  providerUrl.searchParams.set("data", verifyUrl);

  return NextResponse.redirect(providerUrl, 307);
}
