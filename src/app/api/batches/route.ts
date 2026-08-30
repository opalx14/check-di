import { NextResponse } from "next/server";

import { batchRepository } from "@/lib/db/persistent-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productName?: string;
      origin?: string;
      publicId?: string;
    };

    const batch = await batchRepository.createBatch({
      productName: body.productName ?? "",
      origin: body.origin ?? "",
      publicId: body.publicId,
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
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = message === "public_id_exists" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
