import { NextResponse } from "next/server";

import {
  CHECK_DI_AUTH_ACCESS_COOKIE,
  CHECK_DI_AUTH_REFRESH_COOKIE,
  CheckDiAuthError,
  getOrganizationMemberships,
  signInCheckDiWithPassword,
} from "@/lib/auth/server";
import {
  CHECK_DI_DEMO_EMAIL,
  CHECK_DI_DEMO_SESSION_COOKIE,
  loginDemoProducer,
} from "@/lib/auth/demo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email ?? "";
    const password = body.password ?? "";
    const secure = process.env.NODE_ENV === "production";

    let demoSession: Awaited<ReturnType<typeof loginDemoProducer>> = null;
    try {
      demoSession = await loginDemoProducer(email, password);
    } catch (error) {
      if (error instanceof Error && error.message === "invalid_credentials") {
        return NextResponse.json(
          { ok: false, error: "invalid_credentials" },
          { status: 401 },
        );
      }
      throw error;
    }
    if (demoSession) {
      const response = NextResponse.json({
        ok: true,
        demo: true,
        user: demoSession.user,
        memberships: [demoSession.membership],
      });
      response.cookies.set(CHECK_DI_DEMO_SESSION_COOKIE, demoSession.token, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      response.cookies.set(CHECK_DI_AUTH_ACCESS_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 0,
      });
      response.cookies.set(CHECK_DI_AUTH_REFRESH_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    if (email.trim().toLowerCase() === CHECK_DI_DEMO_EMAIL) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 },
      );
    }

    const session = await signInCheckDiWithPassword(email, password);
    const memberships = await getOrganizationMemberships(session.user.id);

    const response = NextResponse.json({
      ok: true,
      user: session.user,
      memberships,
    });

    response.cookies.set(CHECK_DI_DEMO_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
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
