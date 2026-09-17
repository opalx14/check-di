import { NextResponse } from "next/server";

import { authorizeManagedEventRequest } from "@/lib/auth/authorization";
import { CheckDiAuthError } from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import { anchorPersistedTraceEvent } from "@/lib/solana/anchor-service";
import { isSolanaAutoAnchorEnabled } from "@/lib/solana/server";

const CONFIRM_ROLES = ["owner", "operator", "inspector"] as const;

function requiresProductPhoto(event: {
  stage: string;
  documentEvidence?: { mimeType: string }[];
}) {
  return (
    event.stage === "production" &&
    !(event.documentEvidence ?? []).some((document) =>
      document.mimeType.startsWith("image/"),
    )
  );
}

function errorResponse(error: unknown) {
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
      : message === "organization_wallet_required" ||
          message === "wallet_public_key_mismatch" ||
          message === "product_photo_required"
        ? 409
        : 400;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; eventId: string }>;
  },
) {
  try {
    const { id, eventId } = await params;
    const { actor, event } = await authorizeManagedEventRequest(
      request,
      id,
      eventId,
      CONFIRM_ROLES,
    );
    if (actor.context && requiresProductPhoto(event)) {
      throw new Error("product_photo_required");
    }
    const prepared = await batchRepository.prepareEventConfirmation(id, eventId);

    if (!actor.context) {
      return NextResponse.json({
        ok: true,
        signingMode: "demo",
        ...prepared,
      });
    }

    const walletPublicKey = actor.membership?.walletPublicKey;
    if (!walletPublicKey) throw new Error("organization_wallet_required");

    return NextResponse.json({
      ok: true,
      signingMode: "phantom",
      ...prepared,
      walletPublicKey,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

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
    const { actor, event } = await authorizeManagedEventRequest(
      request,
      id,
      eventId,
      CONFIRM_ROLES,
    );
    if (actor.context && requiresProductPhoto(event)) {
      throw new Error("product_photo_required");
    }

    let confirmedEvent;
    if (actor.context) {
      const walletPublicKey = actor.membership?.walletPublicKey;
      if (!walletPublicKey) throw new Error("organization_wallet_required");

      const body = (await request.json().catch(() => ({}))) as {
        signerPublicKey?: string;
        signatureBase64?: string;
      };
      if (!body.signerPublicKey || body.signerPublicKey !== walletPublicKey) {
        throw new Error("wallet_public_key_mismatch");
      }
      if (!body.signatureBase64) throw new Error("external_event_signature_missing");

      const signature = Buffer.from(body.signatureBase64, "base64").toString(
        "base64url",
      );
      confirmedEvent = await batchRepository.confirmEvent(id, eventId, {
        signerPublicKey: walletPublicKey,
        signature,
      });

      return NextResponse.json({
        ok: true,
        event: confirmedEvent,
        signingMode: "phantom",
        solana: {
          anchored: false,
          skipped: true,
          requiresWalletTransaction: true,
        },
      });
    }

    confirmedEvent = await batchRepository.confirmEvent(id, eventId);

    if (!isSolanaAutoAnchorEnabled()) {
      return NextResponse.json({
        ok: true,
        event: confirmedEvent,
        signingMode: "demo",
        solana: { anchored: false, skipped: true },
      });
    }

    const anchorResult = await anchorPersistedTraceEvent(id, eventId);
    return NextResponse.json({
      ok: true,
      event: anchorResult.event,
      signingMode: "demo",
      solana: {
        anchored: anchorResult.anchored,
        reused: anchorResult.reused,
        proofKind: anchorResult.proofKind,
        fallback: "fallback" in anchorResult ? anchorResult.fallback : false,
        registryError:
          "registryError" in anchorResult
            ? anchorResult.registryError
            : undefined,
        error: "error" in anchorResult ? anchorResult.error : undefined,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
