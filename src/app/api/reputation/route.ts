import { NextResponse } from "next/server";

// Public reputation endpoint.
// GET /api/reputation

export async function GET() {
  // In production: read from on-chain Odra registry via CSPR.cloud.
  // For demo: return computed reputation from the deterministic pipeline.

  return NextResponse.json({
    agentKey: "0xoracle-agent-demo",
    score: 0.5518,
    history: [
      { step: "t0", score: 0.7725, error: 0.0015, settledAt: "2026-06-11T10:30:00Z" },
      { step: "t1", score: 0.7882, error: 0.002, settledAt: "2026-06-11T11:30:00Z" },
      { step: "t2", score: 0.5518, error: 0.0441, settledAt: "2026-06-11T12:30:00Z" },
    ],
    queryPrice: "$0.000552",
    note: "In production, these values come from on-chain contract state.",
  });
}
