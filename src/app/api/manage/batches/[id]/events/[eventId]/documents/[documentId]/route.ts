import { NextResponse } from "next/server";

import { authorizeManagedEventRequest } from "@/lib/auth/authorization";
import { CheckDiAuthError } from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import { deleteConfiguredDocument } from "@/lib/documents";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; eventId: string; documentId: string }>;
  },
) {
  try {
    const { id, eventId, documentId } = await params;
    const authorized = await authorizeManagedEventRequest(request, id, eventId, [
      "owner",
      "operator",
      "inspector",
    ]);
    if (authorized.event.status !== "draft") {
      return NextResponse.json(
        { ok: false, error: "event_not_draft" },
        { status: 409 },
      );
    }

    const evidence = authorized.event.documentEvidence?.find(
      (item) => item.id === documentId,
    );
    if (!evidence) {
      return NextResponse.json(
        { ok: false, error: "document_not_found" },
        { status: 404 },
      );
    }

    const event = await batchRepository.removeDocumentEvidence(
      authorized.batch.id,
      authorized.event.id,
      documentId,
    );
    await deleteConfiguredDocument({
      batchId: authorized.batch.id,
      eventId: authorized.event.id,
      documentId,
      mimeType: evidence.mimeType,
    });

    return NextResponse.json({ ok: true, event, deletedDocumentId: documentId });
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "batch_not_found" ||
      message === "event_not_found" ||
      message === "document_not_found"
        ? 404
        : message === "event_not_draft"
          ? 409
          : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
