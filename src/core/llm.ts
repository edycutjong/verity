// Real LLM analyst over the oracle timeline — a genuine Claude call, guardrailed.
//
// Division of labor (honesty by construction):
//  - NUMBERS are always deterministic: posted values, EWMA scores, prices, and
//    miss detection come from the rule engine (core/reasoning + core/reputation).
//    The LLM cannot change them.
//  - The LLM contributes what a rule engine can't: a written analyst judgment of
//    WHY the timeline looks the way it does, independent risk flags on sources,
//    and an assessment of whether the reputation penalty was warranted.
//  - No key / API error → `null`, and callers fall back to the deterministic
//    rationale, so keyless judges lose nothing.
//
// The pipeline is fixture-deterministic, so the analysis is cached per snapshot
// digest — the public x402 endpoint triggers at most one Claude call per input.

import { createHash } from "node:crypto";
import { llmConfigured, structuredCall } from "@/lib/anthropic";
import { config } from "@/lib/config";
import type { OracleSnapshot } from "@/lib/pipeline";

export interface OracleAnalysis {
  /** Analyst narrative over the full timeline (why the score moved). */
  narrative: string;
  /** Source-level risk flags, e.g. "source_c: stale feed suspected at t2". */
  riskFlags: string[];
  /** Was the t-series reputation penalty warranted, per the analyst? */
  penaltyWarranted: boolean;
  /** Model that produced the analysis. */
  model: string;
}

const SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    narrative: {
      type: "string",
      description:
        "3-5 sentence analyst judgment of the oracle's timeline: what drove the reputation trajectory, referencing concrete steps and values.",
    },
    riskFlags: {
      type: "array",
      items: { type: "string" },
      description: "Independent per-source risk observations (may be empty).",
    },
    penaltyWarranted: {
      type: "boolean",
      description: "Whether the reputation penalty on the miss step was economically warranted.",
    },
  },
  required: ["narrative", "riskFlags", "penaltyWarranted"],
  additionalProperties: false,
};

const SYSTEM = `You are the risk analyst for Verity, an RWA oracle on Casper whose
reputation (EWMA, basis points) is bonded to accuracy: a miss beyond the 2% threshold
drops the score, which drops the x402 pay-per-query price the oracle can charge.
You are given the oracle's settled timeline. Judge it like an auditor:
- Ground every claim in the numbers provided. Never invent values.
- Flag sources whose readings look stale, manipulated, or out of consensus.
- State plainly whether the penalty mechanics worked as designed.`;

interface CacheEntry {
  digest: string;
  analysis: OracleAnalysis;
}
let cache: CacheEntry | null = null;

function digestOf(snapshot: OracleSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot.timeline)).digest("hex");
}

/**
 * Analyze the snapshot with a real Claude call (cached per snapshot digest).
 * Returns `null` when no ANTHROPIC_API_KEY is configured or the call fails —
 * callers must treat that as "deterministic rationale only".
 */
export async function analyzeSnapshot(snapshot: OracleSnapshot): Promise<OracleAnalysis | null> {
  if (!llmConfigured()) return null;

  const digest = digestOf(snapshot);
  if (cache?.digest === digest) return cache.analysis;

  const timeline = snapshot.timeline.map((t) => ({
    step: t.step,
    action: t.action,
    postedValue: t.postedValue,
    groundTruth: t.groundTruth,
    relativeError: t.relativeError,
    isMiss: t.isMiss,
    repScore: t.repScore,
    queryPrice: t.queryPrice,
    flaggedSources: t.flaggedSources,
    deterministicRationale: t.rationale,
  }));

  try {
    const out = await structuredCall<Omit<OracleAnalysis, "model">>({
      model: config.analystModel,
      system: [{ text: SYSTEM, cache: true }],
      user:
        `Asset: ${snapshot.asset}\n` +
        `Settled timeline (deterministic engine output):\n` +
        JSON.stringify(timeline, null, 2),
      schema: SCHEMA,
      maxTokens: 700,
    });
    const analysis: OracleAnalysis = { ...out, model: config.analystModel };
    cache = { digest, analysis };
    return analysis;
  } catch {
    // Graceful degradation: the deterministic pipeline is the source of truth.
    return null;
  }
}

/** Test hook — clears the per-snapshot cache. */
export function _resetAnalysisCache(): void {
  cache = null;
}
