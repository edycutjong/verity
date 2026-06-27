// Consumer LTV panel — demonstrates why oracle accountability matters.
// A mock lending protocol sizes LTV by the oracle's reputation score.

import type { ConsumerLTVState } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

/** Maximum LTV ratio at perfect reputation (1.0). */
const MAX_LTV = 0.8;

/** Minimum LTV ratio at zero reputation. */
const MIN_LTV = 0.3;

/** Reputation threshold below which LTV is tightened. */
const TIGHTENING_THRESHOLD = 0.7;

// ── LTV Computation ────────────────────────────────────────────────────────

/**
 * Compute LTV ratio based on oracle reputation.
 * Higher reputation → higher LTV (more trust in the price feed).
 * Lower reputation → tightened LTV (less trust, protect against bad data).
 */
export function computeLTV(reputation: number): ConsumerLTVState {
  const clampedRep = Math.max(0, Math.min(1, reputation));
  const ltvRatio = MIN_LTV + (MAX_LTV - MIN_LTV) * clampedRep;
  const tightened = clampedRep < TIGHTENING_THRESHOLD;

  return {
    ltvRatio,
    oracleReputation: clampedRep,
    baseLTV: MAX_LTV,
    tightened,
  };
}

/**
 * Format LTV for display (e.g., "72.5%").
 */
export function formatLTV(state: ConsumerLTVState): string {
  return `${(state.ltvRatio * 100).toFixed(1)}%`;
}

/**
 * Get a human-readable status for the LTV panel.
 */
export function getLTVStatus(state: ConsumerLTVState): string {
  if (state.tightened) {
    return `LTV tightened to ${formatLTV(state)} — oracle reputation below threshold`;
  }
  return `LTV at ${formatLTV(state)} — oracle reputation healthy`;
}

export const LTV_CONSTANTS = {
  MAX_LTV,
  MIN_LTV,
  TIGHTENING_THRESHOLD,
} as const;
