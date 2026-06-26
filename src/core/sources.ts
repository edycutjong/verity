// Multi-source ingestion and deterministic baseline computation.
// The raw numbers come from real sources (never invented by the LLM).
// A deterministic aggregator computes a baseline; the LLM agent may only
// deviate with written justification.

import type { SourceReading, SourceStep } from "./types";

/**
 * Compute the deterministic baseline from a set of source readings.
 * Uses the median of all readings as the baseline, providing robustness
 * against a single outlier.
 */
export function computeBaseline(readings: SourceReading[]): number {
  if (readings.length === 0) return 0;
  const values = readings.map((r) => r.value).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return (values[mid - 1] + values[mid]) / 2;
  }
  return values[mid];
}

/**
 * Detect outlier sources. A source is an outlier if its value deviates
 * from the median by more than the threshold percentage.
 */
export function detectOutliers(
  readings: SourceReading[],
  thresholdPct: number = 5,
): string[] {
  if (readings.length < 2) return [];
  const baseline = computeBaseline(readings);
  if (baseline === 0) return [];

  return readings
    .filter((r) => {
      const deviation = Math.abs(r.value - baseline) / baseline * 100;
      return deviation > thresholdPct;
    })
    .map((r) => r.sourceId);
}

/**
 * Compute the consensus strength among sources (0–1).
 * 1.0 = all sources agree perfectly; 0.0 = maximum disagreement.
 * Uses the coefficient of variation (CV) inverted.
 */
export function computeConsensus(readings: SourceReading[]): number {
  if (readings.length < 2) return 1;
  const values = readings.map((r) => r.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const cv = Math.sqrt(variance) / Math.abs(mean);
  // Map CV to 0–1: CV of 0 → consensus 1; CV of 0.3 → consensus ~0
  return Math.max(0, Math.min(1, 1 - cv / 0.3));
}

/**
 * Filter out flagged outlier sources and compute a cleaned baseline.
 */
export function computeCleanedBaseline(
  readings: SourceReading[],
  flaggedSources: string[],
): number {
  const cleanReadings = readings.filter(
    (r) => !flaggedSources.includes(r.sourceId),
  );
  return computeBaseline(cleanReadings.length > 0 ? cleanReadings : readings);
}

/**
 * Check if sources have sufficient agreement to justify posting.
 * Returns false if consensus is too low (agent should abstain).
 */
export function shouldPost(
  readings: SourceReading[],
  minConsensus: number = 0.5,
): boolean {
  const outliers = detectOutliers(readings);
  const cleanReadings = readings.filter(
    (r) => !outliers.includes(r.sourceId),
  );
  if (cleanReadings.length === 0) return false;
  return computeConsensus(cleanReadings) >= minConsensus;
}

/**
 * Compute all source metrics for a step.
 */
export function analyzeStep(step: SourceStep): {
  baseline: number;
  outliers: string[];
  consensus: number;
  cleanedBaseline: number;
  shouldPost: boolean;
} {
  const baseline = computeBaseline(step.readings);
  const outliers = detectOutliers(step.readings);
  const consensus = computeConsensus(step.readings);
  const cleaned = computeCleanedBaseline(step.readings, outliers);
  const post = shouldPost(step.readings);
  return { baseline, outliers, consensus, cleanedBaseline: cleaned, shouldPost: post };
}
