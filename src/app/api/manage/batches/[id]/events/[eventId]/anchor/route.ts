import { NextResponse } from "next/server";

import { authorizeManagedEventRequest } from "@/lib/auth/authorization";
import { CheckDiAuthError } from "@/lib/auth/server";
import { batchRepository } from "@/lib/db";
import { anchorPersistedTraceEvent } from "@/lib/solana/anchor-service";
import {
  preparePhantomRegistryTransaction,
  submitPhantomRegistryTransaction,
} from "@/lib/solana/phantom-registry";

const ANCHOR_ROLES = ["owner", "operator", "inspector"] as const;

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
          message === "registry_chain_head_not_ready"
        ? 409
        : 400;
  return NextResponse.json({ ok: false, error: message }, { status });
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
    const { actor, batch, event } = await authorizeManagedEventRequest(
      request,
      id,
      eventId,
      ANCHOR_ROLES,
    );

    if (actor.context) {
      const walletPublicKey = actor.membership?.walletPublicKey;
      if (!walletPublicKey) throw new Error("organization_wallet_required");

      const body = (await request.json().catch(() => ({}))) as {
        action?: "prepare" | "submit";
        signedTransactionBase64?: string;
      };

      if (body.action === "submit") {
        if (!body.signedTransactionBase64) {
          throw new Error("phantom_signed_transaction_missing");
        }
        const result = await submitPhantomRegistryTransaction({
          publicId: batch.publicId,
          event,
          walletPublicKey,
          signedTransactionBase64: body.signedTransactionBase64,
        });
        const persisted = await batchRepository.setSolanaProof(
          id,
          eventId,
          result.proof,
        );
        return NextResponse.json({
          ok: true,
          event: persisted,
          signingMode: "phantom",
          solana: {
            anchored: true,
            reused: result.reused,
            proofKind: "check-di-registry",
            transactionSignature: result.transactionSignature,
          },
        });
      }

      const prepared = await preparePhantomRegistryTransaction({
        publicId: batch.publicId,
        event,
        walletPublicKey,
      });
      if (prepared.alreadyAnchored) {
        const persisted = await batchRepository.setSolanaProof(
          id,
          eventId,
          prepared.proof,
        );
        return NextResponse.json({
          ok: true,
          event: persisted,
          signingMode: "phantom",
          solana: {
            anchored: true,
            reused: true,
            proofKind: "check-di-registry",
          },
        });
      }

      return NextResponse.json({
        ok: true,
        signingMode: "phantom",
        solana: {
          anchored: false,
          requiresWalletTransaction: true,
          transactionBase64: prepared.transactionBase64,
          walletPublicKey: prepared.walletPublicKey,
          registryAddress: prepared.registryAddress,
          eventPda: prepared.eventPda,
          blockhash: prepared.blockhash,
          lastValidBlockHeight: prepared.lastValidBlockHeight,
        },
      });
    }

    const result = await anchorPersistedTraceEvent(id, eventId);
    return NextResponse.json(
      {
        ok: result.anchored,
        event: result.event,
        signingMode: "demo",
        solana: {
          anchored: result.anchored,
          reused: result.reused,
          proofKind: result.proofKind,
          fallback: "fallback" in result ? result.fallback : false,
          registryError:
            "registryError" in result ? result.registryError : undefined,
          error: "error" in result ? result.error : undefined,
        },
      },
      { status: result.anchored ? 200 : 503 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
