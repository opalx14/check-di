import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import {
  buildWalletLinkMessage,
  CHECK_DI_WALLET_CHALLENGE_COOKIE,
  CHECK_DI_WALLET_CHALLENGE_MAX_AGE_SECONDS,
  requireWalletOwnerMembership,
} from "@/lib/auth/wallet";
import { CheckDiAuthError } from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      organizationId?: string;
    };
    const organizationId = body.organizationId?.trim();
    if (!organizationId) {
      return NextResponse.json(
        { ok: false, error: "organization_required" },
        { status: 400 },
      );
    }

    const { userId } = await requireWalletOwnerMembership(request, organizationId);
    const nonce = randomBytes(24).toString("base64url");
    const message = buildWalletLinkMessage({ organizationId, userId, nonce });

    const response = NextResponse.json({
      ok: true,
      organizationId,
      nonce,
      message,
      expiresIn: CHECK_DI_WALLET_CHALLENGE_MAX_AGE_SECONDS,
    });
    response.cookies.set(CHECK_DI_WALLET_CHALLENGE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CHECK_DI_WALLET_CHALLENGE_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("check_di_wallet_challenge_failed", error);
    return NextResponse.json(
      { ok: false, error: "wallet_challenge_failed" },
      { status: 500 },
    );
  }
}
