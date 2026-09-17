import { NextResponse } from "next/server";

import {
  CHECK_DI_AUTH_ACCESS_COOKIE,
  CHECK_DI_AUTH_REFRESH_COOKIE,
} from "@/lib/auth/server";
import { CHECK_DI_DEMO_SESSION_COOKIE } from "@/lib/auth/demo";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";

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
  response.cookies.set(CHECK_DI_DEMO_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  return response;
}
