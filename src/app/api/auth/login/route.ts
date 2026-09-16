import { NextResponse } from "next/server";

import {
  CHECK_DI_AUTH_ACCESS_COOKIE,
  CHECK_DI_AUTH_REFRESH_COOKIE,
  CheckDiAuthError,
  getOrganizationMemberships,
  signInCheckDiWithPassword,
} from "@/lib/auth/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const session = await signInCheckDiWithPassword(
      body.email ?? "",
      body.password ?? "",
    );
    const memberships = await getOrganizationMemberships(session.user.id);

    const response = NextResponse.json({
      ok: true,
      user: session.user,
      memberships,
    });
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set(CHECK_DI_AUTH_ACCESS_COOKIE, session.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: session.expiresIn,
    });
    response.cookies.set(CHECK_DI_AUTH_REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    if (error instanceof CheckDiAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    console.error("check_di_login_failed", error);
    return NextResponse.json(
      { ok: false, error: "login_failed" },
      { status: 500 },
    );
  }
}
