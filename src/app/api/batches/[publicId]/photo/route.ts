import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db";
import { readConfiguredDocumentVerified } from "@/lib/documents";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const batch = await batchRepository.getPublicProof(publicId);
  if (!batch) {
    return NextResponse.json({ ok: false, error: "batch_not_found" }, { status: 404 });
  }

  const photo = batch.events
    .flatMap((event) =>
      (event.documentEvidence ?? []).map((document) => ({ event, document })),
    )
    .find(({ document }) => document.mimeType.startsWith("image/"));

  if (!photo) {
    return NextResponse.json({ ok: false, error: "product_photo_not_found" }, { status: 404 });
  }

  try {
    const bytes = await readConfiguredDocumentVerified({
      batchId: batch.id,
      eventId: photo.event.id,
      documentId: photo.document.id,
      mimeType: photo.document.mimeType,
      expectedSha256: photo.document.sha256,
    });

    return new Response(bytes, {
      headers: {
        "content-type": photo.document.mimeType,
        "cache-control": "public, max-age=300, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "product_photo_unavailable" },
      { status: 404 },
    );
  }
}
