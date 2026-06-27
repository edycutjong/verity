import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    x402: {
      facilitatorReachable: false,
      note: "x402 facilitator connectivity not yet wired — see BUILD_PLAN Day 0",
    },
    contract: {
      deployed: false,
      note: "Odra contract not yet deployed — see BUILD_PLAN Day 1",
    },
    timestamp: new Date().toISOString(),
  });
}
