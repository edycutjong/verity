// Shared deterministic oracle pipeline.
// Server-only (reads fixtures via node:fs). Consumed by the home page (render-time)
// and the x402 /api/value route (request-time) so both tell the exact same story.

import { loadSources, loadGroundTruth, loadExpectedReputation } from "@/lib/fixtures";
import { reasonOverSources, reasonWithOverride } from "@/core/reasoning";
import {
  createReputationState,
  registerPost,
  settlePost,
  getReputation,
  getQueryPrice,
} from "@/core/reputation";
import { postValue, resetPostCounter } from "@/core/post";
import { computeLTV } from "@/core/consumer";
import type { AgentAction } from "@/core/types";

/** One settled (or abstained) step of the oracle's life, fully serializable. */
export interface TimelineEntry {
  step: string;
  action: AgentAction;
  rationale: string;
  flaggedSources: string[];
  confidence: number | null;
  postedValue: number | null;
  groundTruth: number;
  relativeError: number | null;
  isMiss: boolean;
  repScore: number;
  queryPrice: string;
  deployHash: string | null;
  ltvRatio: number;
  ltvTightened: boolean;
  expectedScore: number | null;
}

export interface OracleSnapshot {
  asset: string;
  agentKey: string;
  timeline: TimelineEntry[];
  latest: TimelineEntry;
}

const AGENT_KEY = "0xoracle-agent-demo";

/**
 * Run the full reason → post → settle → reprice loop over the fixture timeline.
 * Deterministic given the fixtures; `t2` is the engineered miss that drops the score.
 */
export function runOraclePipeline(): OracleSnapshot {
  resetPostCounter();
  const sources = loadSources();
  const groundTruths = loadGroundTruth();
  const expectedRep = loadExpectedReputation();
  const repState = createReputationState();

  const timeline: TimelineEntry[] = [];

  for (let i = 0; i < sources.steps.length; i++) {
    const step = sources.steps[i];
    const gt = groundTruths[i];
    const expRep = expectedRep[i];

    // t2 is the engineered miss: force value 1950 at confidence 0.85.
    const decision =
      step.label === "t2"
        ? reasonWithOverride(step.readings, 1950, 0.85)
        : reasonOverSources(step.readings);

    let deployHash: string | null = null;
    let relativeError: number | null = null;
    let isMiss = false;
    let repScore = getReputation(repState, AGENT_KEY).score;

    if (decision.action === "post") {
      const post = postValue(sources.asset, decision, AGENT_KEY);
      registerPost(repState, post);
      const settlement = settlePost(repState, post.postId, gt.trueValue, step.label);
      repScore = settlement.scoreAfter;
      deployHash = post.deployHash;
      relativeError = settlement.relativeError;
      isMiss = settlement.isMiss;
    }

    const ltv = computeLTV(repScore);

    timeline.push({
      step: step.label,
      action: decision.action,
      rationale: decision.rationale,
      flaggedSources: decision.flaggedSources,
      confidence: decision.confidence ?? null,
      postedValue: decision.action === "post" ? (decision.postedValue ?? null) : null,
      groundTruth: gt.trueValue,
      relativeError,
      isMiss,
      repScore,
      queryPrice: getQueryPrice(repScore),
      deployHash,
      ltvRatio: ltv.ltvRatio,
      ltvTightened: ltv.tightened,
      expectedScore: expRep?.expectedScore ?? null,
    });
  }

  return {
    asset: sources.asset,
    agentKey: AGENT_KEY,
    timeline,
    latest: timeline[timeline.length - 1],
  };
}
