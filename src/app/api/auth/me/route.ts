import { NextResponse } from "next/server";

import { getCheckDiAuthContext } from "@/lib/auth/server";

export async function GET(request: Request) {
  try {
    const context = await getCheckDiAuthContext(request);
    if (!context) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: context.user,
      memberships: context.memberships,
    });
  } catch (error) {
    console.error("check_di_auth_context_failed", error);
    return NextResponse.json(
      { ok: false, error: "auth_context_failed" },
      { status: 500 },
    );
  }
}
