import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "check-di",
    phase: "web-foundation",
    network: "devnet",
  });
}
