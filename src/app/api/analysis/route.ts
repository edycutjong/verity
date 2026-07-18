// Claude analyst read — powers the dashboard's Analyst Panel.
//   GET /api/analysis → { analysis: OracleAnalysis | null }
//
// `null` means no ANTHROPIC_API_KEY is configured (or the call failed): the UI
// shows the deterministic-fallback state. The analysis is cached per snapshot
// digest inside core/llm, so this public endpoint triggers at most one Claude
// call per deployed instance.

import { NextResponse } from "next/server";
import { runOraclePipeline } from "@/lib/pipeline";
import { analyzeSnapshot } from "@/core/llm";

export async function GET() {
  const analysis = await analyzeSnapshot(runOraclePipeline());
  return NextResponse.json({ analysis });
}
