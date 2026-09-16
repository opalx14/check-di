import { NextResponse } from "next/server";

import { checkCreditcoinReadiness } from "@/lib/creditcoin/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await checkCreditcoinReadiness();
  return NextResponse.json(readiness, {
    status: readiness.networkReady ? 200 : 503,
    headers: {
      "cache-control": "no-store",
    },
  });
}
