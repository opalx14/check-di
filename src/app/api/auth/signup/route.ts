import { NextResponse } from "next/server";

import {
  CHECK_DI_AUTH_ACCESS_COOKIE,
  CHECK_DI_AUTH_REFRESH_COOKIE,
} from "@/lib/auth/server";
import { CHECK_DI_DEMO_SESSION_COOKIE } from "@/lib/auth/demo";
import {
  CheckDiSignupError,
  consumeSignupRateLimit,
  signUpCheckDiUser,
} from "@/lib/auth/signup";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    if (!consumeSignupRateLimit(clientIp)) {
      return NextResponse.json(
        { ok: false, error: "signup_rate_limit_exceeded" },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      organizationName?: string;
    };

    const email = body.email ?? "";
    const password = body.password ?? "";
    const organizationName = body.organizationName ?? "";

    const result = await signUpCheckDiUser({
      email,
      password,
      organizationName,
    });

    const secure = process.env.NODE_ENV === "production";
    const response = NextResponse.json({
      ok: true,
      autoLogin: Boolean(result.session),
      emailConfirmationRequired: result.confirmationRequired,
      hackathonAutoConfirmed: result.hackathonAutoConfirmed,
      user: result.user,
      organization: result.organization,
    });

    // Clear legacy/demo cookies
    response.cookies.set(CHECK_DI_DEMO_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });

    // If instant session was granted, establish HttpOnly cookies
    if (result.session) {
      response.cookies.set(
        CHECK_DI_AUTH_ACCESS_COOKIE,
        result.session.accessToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: result.session.expiresIn,
        },
      );
      response.cookies.set(
        CHECK_DI_AUTH_REFRESH_COOKIE,
        result.session.refreshToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        },
      );
    }

    return response;
  } catch (error) {
    if (error instanceof CheckDiSignupError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    console.error("check_di_signup_failed", error);
    return NextResponse.json(
      { ok: false, error: "signup_failed" },
      { status: 500 },
    );
  }
}
