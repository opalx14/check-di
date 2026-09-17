import { NextResponse } from "next/server";

import {
  buildWalletLinkMessage,
  CHECK_DI_WALLET_CHALLENGE_COOKIE,
  getWalletChallengeNonce,
  requireWalletOwnerMembership,
  setOrganizationWalletPublicKey,
  verifySolanaMessageSignature,
} from "@/lib/auth/wallet";
import { CheckDiAuthError } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      organizationId?: string;
      publicKey?: string;
      signatureBase64?: string;
      nonce?: string;
    };
    const organizationId = body.organizationId?.trim();
    const publicKey = body.publicKey?.trim();
    const signatureBase64 = body.signatureBase64?.trim();
    const nonce = body.nonce?.trim() || getWalletChallengeNonce(request);

    if (!organizationId || !publicKey || !signatureBase64 || !nonce) {
      return NextResponse.json(
        { ok: false, error: "wallet_verification_input_missing" },
        { status: 400 },
      );
    }

    const { userId } = await requireWalletOwnerMembership(request, organizationId);
    const message = buildWalletLinkMessage({ organizationId, userId, nonce });
    if (
      !verifySolanaMessageSignature({
        publicKey,
        signatureBase64,
        message,
      })
    ) {
      return NextResponse.json(
        { ok: false, error: "wallet_signature_invalid" },
        { status: 400 },
      );
    }

    await setOrganizationWalletPublicKey(organizationId, publicKey);

    const response = NextResponse.json({
      ok: true,
      organizationId,
      walletPublicKey: publicKey,
      verified: true,
    });
    response.cookies.set(CHECK_DI_WALLET_CHALLENGE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("check_di_wallet_verify_failed", error);
    return NextResponse.json(
      { ok: false, error: "wallet_verification_failed" },
      { status: 500 },
    );
  }
}
