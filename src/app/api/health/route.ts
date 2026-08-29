import { NextResponse } from "next/server";
import { SOLANA_NETWORK } from "@/lib/solana/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "check-di",
    phase: "traceability-demo",
    network: SOLANA_NETWORK,
  });
}
