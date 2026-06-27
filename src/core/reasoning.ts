// LLM reasoning agent: reconciles sources, detects manipulation/staleness,
// decides post-or-abstain, produces calibrated confidence + written rationale.
//
// In production, this calls Claude claude-opus-4-8. For the deterministic demo,
// the reasoning is rule-based (same logic the LLM would apply) so the demo
// always tells the same story.

import type { SourceReading, AgentDecision } from "./types";
import {
  computeBaseline,
  detectOutliers,
  computeConsensus,
  computeCleanedBaseline,
} from "./sources";

// ── Confidence Calibration ─────────────────────────────────────────────────

/**
 * Calibrate confidence based on source consensus and outlier presence.
 * Higher consensus + no outliers = higher confidence.
 */
export function calibrateConfidence(
  consensus: number,
  outlierCount: number,
  totalSources: number,
): number {
  // Base confidence from consensus.
  let confidence = consensus;

  // Penalize for outlier presence.
  if (totalSources > 0 && outlierCount > 0) {
    const outlierRatio = outlierCount / totalSources;
    confidence *= 1 - outlierRatio * 0.5;
  }

  // Clamp to [0.1, 0.99].
  return Math.max(0.1, Math.min(0.99, confidence));
}

// ── Reasoning Agent ────────────────────────────────────────────────────────

/**
 * Reason over a set of source readings and decide whether to post.
 * This is the core agentic logic:
 * 1. Compute deterministic baseline.
 * 2. Detect outliers (potential manipulation/staleness).
 * 3. Assess consensus among reliable sources.
 * 4. Decide: post (with confidence + rationale) or abstain.
 */
export function reasonOverSources(readings: SourceReading[]): AgentDecision {
  if (readings.length === 0) {
    return {
      action: "abstain",
      rationale: "No source readings available — abstaining to avoid posting ungrounded data.",
      flaggedSources: [],
      deterministicBaseline: 0,
    };
  }

  const baseline = computeBaseline(readings);
  const outliers = detectOutliers(readings);
  const consensus = computeConsensus(readings);

  // If all sources are outliers, abstain.
  if (outliers.length === readings.length) {
    return {
      action: "abstain",
      rationale: `All ${readings.length} sources show extreme disagreement (consensus: ${(consensus * 100).toFixed(1)}%). Abstaining — cannot determine a reliable value.`,
      flaggedSources: outliers,
      deterministicBaseline: baseline,
    };
  }

  // If consensus among clean sources is too low, abstain.
  const cleanReadings = readings.filter(
    (r) => !outliers.includes(r.sourceId),
  );
  const cleanConsensus = computeConsensus(cleanReadings);

  if (cleanConsensus < 0.5 && cleanReadings.length > 1) {
    return {
      action: "abstain",
      rationale: `Even after removing ${outliers.length} outlier(s), remaining sources disagree significantly (consensus: ${(cleanConsensus * 100).toFixed(1)}%). Abstaining rather than guessing.`,
      flaggedSources: outliers,
      deterministicBaseline: baseline,
    };
  }

  // Compute the cleaned baseline (excluding outliers).
  const cleanedValue = computeCleanedBaseline(readings, outliers);
  const confidence = calibrateConfidence(cleanConsensus, outliers.length, readings.length);

  // Build rationale.
  let rationale: string;
  if (outliers.length > 0) {
    const outlierDetails = outliers
      .map((id) => {
        const r = readings.find((s) => s.sourceId === id);
        const mappedName =
          id === "source_a"
            ? "Bloomberg"
            : id === "source_b"
              ? "Reuters"
              : id === "source_c"
                ? "Binance"
                : id;
        return r ? `${mappedName} (${r.value})` : mappedName;
      })
      .join(", ");
    rationale = `Detected ${outliers.length} outlier source(s): ${outlierDetails}. ` +
      `These deviate significantly from the consensus baseline of ${baseline.toFixed(1)}. ` +
      `Down-weighting flagged sources and posting cleaned value ${cleanedValue.toFixed(1)} ` +
      `with reduced confidence ${(confidence * 100).toFixed(0)}% ` +
      `(clean-source consensus: ${(cleanConsensus * 100).toFixed(1)}%).`;
  } else {
    rationale = `All ${readings.length} sources agree within tolerance. ` +
      `Consensus: ${(consensus * 100).toFixed(1)}%. ` +
      `Posting baseline value ${cleanedValue.toFixed(1)} ` +
      `with confidence ${(confidence * 100).toFixed(0)}%.`;
  }

  return {
    action: "post",
    postedValue: cleanedValue,
    confidence,
    rationale,
    flaggedSources: outliers,
    deterministicBaseline: baseline,
  };
}

/**
 * Force a specific posted value (used by the seed script to engineer the t2 miss).
 * The agent still reasons, but the value is overridden.
 */
export function reasonWithOverride(
  readings: SourceReading[],
  overrideValue: number,
  overrideConfidence: number,
): AgentDecision {
  const decision = reasonOverSources(readings);
  if (decision.action === "abstain") return decision;

  return {
    ...decision,
    postedValue: overrideValue,
    confidence: overrideConfidence,
    rationale: decision.rationale + ` [Override: posting ${overrideValue} at ${(overrideConfidence * 100).toFixed(0)}% for demo.]`,
  };
}
