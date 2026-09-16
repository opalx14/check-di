import { NextResponse } from "next/server";

import {
  buildDocumentCrossChecks,
  extractDocumentDemo,
  MAX_DOCUMENT_BYTES,
} from "@/lib/ai/document-extraction";
import { authorizeManagedEventRequest } from "@/lib/auth/authorization";
import { CheckDiAuthError } from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import {
  detectDocumentMimeType,
  saveConfiguredDocument,
  validateDocumentUpload,
} from "@/lib/documents";
import type { DocumentEvidence } from "@/types/evidence";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; eventId: string }>;
  },
) {
  try {
    const { id, eventId } = await params;
    const authorized = await authorizeManagedEventRequest(request, id, eventId, [
      "owner",
      "operator",
      "inspector",
    ]);
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "document_missing" },
        { status: 400 },
      );
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return NextResponse.json(
        { ok: false, error: "document_too_large" },
        { status: 413 },
      );
    }

    const batch = authorized.batch;
    const event = authorized.event;
    if (event.status !== "draft") {
      return NextResponse.json(
        { ok: false, error: "event_not_draft" },
        { status: 409 },
      );
    }
    if ((event.documentEvidence?.length ?? 0) >= 5) {
      return NextResponse.json(
        { ok: false, error: "document_limit_reached" },
        { status: 409 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedMimeType = detectDocumentMimeType(bytes);
    if (!detectedMimeType) throw new Error("unsupported_document_type");
    if (file.type && file.type !== detectedMimeType) {
      throw new Error("document_content_type_mismatch");
    }
    validateDocumentUpload({
      filename: file.name,
      mimeType: detectedMimeType,
      sizeBytes: bytes.byteLength,
    });

    const saved = await saveConfiguredDocument({
      batchId: batch.id,
      eventId: event.id,
      filename: file.name,
      mimeType: detectedMimeType,
      bytes,
    });

    const extraction = extractDocumentDemo({
      filename: file.name,
      mimeType: detectedMimeType,
      context: {
        publicId: batch.publicId,
        productName: batch.productName,
        origin: batch.origin,
        event,
      },
    });

    const evidence: DocumentEvidence = {
      id: saved.id,
      filename: file.name,
      mimeType: detectedMimeType,
      sizeBytes: bytes.byteLength,
      sha256: saved.sha256,
      uploadedAt: new Date().toISOString(),
      extraction,
    };
    const validations = buildDocumentCrossChecks({ batch, event, evidence });
    const updatedEvent = await batchRepository.attachDocumentEvidence(
      batch.id,
      event.id,
      evidence,
      validations,
    );

    return NextResponse.json(
      {
        ok: true,
        document: evidence,
        validations,
        event: updatedEvent,
        ai: {
          completed: true,
          simulated: true,
          provider: extraction.provider,
          model: extraction.model,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "unknown_error";
    const status =
      message === "batch_not_found" || message === "event_not_found"
        ? 404
        : message === "event_not_draft" ||
            message === "document_limit_reached" ||
            message === "document_exists"
          ? 409
          : message === "document_too_large"
            ? 413
            : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
