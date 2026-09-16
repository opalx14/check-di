import { NextResponse } from "next/server";

import {
  buildDocumentCrossChecks,
  extractDocumentDemo,
} from "@/lib/ai/document-extraction";
import { authorizeManagedEventRequest } from "@/lib/auth/authorization";
import { CheckDiAuthError } from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import { readConfiguredDocumentVerified } from "@/lib/documents";

export const runtime = "nodejs";

export async function POST(
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
    const batch = authorized.batch;
    const event = authorized.event;
    if (event.status !== "draft") {
      return NextResponse.json(
        { ok: false, error: "event_not_draft" },
        { status: 409 },
      );
    }

    const evidence = event.documentEvidence?.find(
      (item) => item.id === documentId,
    );
    if (!evidence) {
      return NextResponse.json(
        { ok: false, error: "document_not_found" },
        { status: 404 },
      );
    }

    await readConfiguredDocumentVerified({
      batchId: batch.id,
      eventId: event.id,
      documentId: evidence.id,
      mimeType: evidence.mimeType,
      expectedSha256: evidence.sha256,
    });
    const extraction = extractDocumentDemo({
      filename: evidence.filename,
      mimeType: evidence.mimeType,
      context: {
        publicId: batch.publicId,
        productName: batch.productName,
        origin: batch.origin,
        event,
      },
    });

    const updatedEvidence = { ...evidence, extraction };
    const validations = buildDocumentCrossChecks({
      batch,
      event,
      evidence: updatedEvidence,
    });
    const updatedEvent = await batchRepository.updateDocumentEvidenceAnalysis(
      batch.id,
      event.id,
      updatedEvidence,
      validations,
    );

    return NextResponse.json({
      ok: true,
      document: updatedEvidence,
      validations,
      event: updatedEvent,
      ai: {
        completed: true,
        simulated: true,
        provider: extraction.provider,
        model: extraction.model,
      },
    });
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
