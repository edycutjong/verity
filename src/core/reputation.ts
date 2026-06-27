// EWMA-based reputation score — rises on accurate posts, falls on misses.
// The score is keyed to the agent's public key; settlement is the only writer.

import type { ReputationScore, SettlementResult, OraclePost } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

/** EWMA smoothing factor (higher = more weight on recent observations). */
const ALPHA = 0.3;

/** Initial reputation score for new agents. */
const INITIAL_SCORE = 0.75;

/** Error threshold: errors above this relative value are considered a "miss". */
const MISS_THRESHOLD = 0.02; // 2%

/** Base query price (scaled by reputation). */
const BASE_QUERY_PRICE = 0.001;

// ── Reputation State ───────────────────────────────────────────────────────

export interface ReputationState {
  /** Current reputation scores by agent key. */
  scores: Map<string, ReputationScore>;
  /** All posts awaiting settlement. */
  pendingPosts: Map<string, OraclePost>;
  /** All settled posts. */
  settledPosts: OraclePost[];
}

export function createReputationState(): ReputationState {
  return {
    scores: new Map(),
    pendingPosts: new Map(),
    settledPosts: [],
  };
}

/**
 * Get or initialize a reputation score for an agent.
 */
export function getReputation(state: ReputationState, agentKey: string): ReputationScore {
  let rep = state.scores.get(agentKey);
  if (!rep) {
    rep = { agentKey, score: INITIAL_SCORE, history: [] };
    state.scores.set(agentKey, rep);
  }
  return rep;
}

/**
 * Register a new post (pending settlement).
 */
export function registerPost(state: ReputationState, post: OraclePost): void {
  state.pendingPosts.set(post.postId, post);
  // Ensure the agent has a reputation entry.
  getReputation(state, post.agentKey);
}

// ── Settlement ─────────────────────────────────────────────────────────────

/**
 * Settle a post against ground truth. Updates the agent's reputation via EWMA.
 *
 * EWMA formula: score_new = α * accuracy + (1 - α) * score_old
 * where accuracy = max(0, 1 - relativeError / MISS_THRESHOLD)
 * so errors above MISS_THRESHOLD produce accuracy=0.
 */
export function settlePost(
  state: ReputationState,
  postId: string,
  groundTruth: number,
  step: string,
): SettlementResult {
  const post = state.pendingPosts.get(postId);
  if (!post) {
    throw new Error(`Post ${postId} not found in pending posts`);
  }

  const rep = getReputation(state, post.agentKey);
  const scoreBefore = rep.score;

  // Compute error.
  const error = Math.abs(post.value - groundTruth);
  const relativeError = groundTruth !== 0 ? error / Math.abs(groundTruth) : (error > 0 ? 1 : 0);
  const isMiss = relativeError > MISS_THRESHOLD;

  // EWMA update: accuracy is 1 when error=0, drops to 0 at MISS_THRESHOLD.
  const accuracy = Math.max(0, 1 - relativeError / MISS_THRESHOLD);
  const scoreAfter = ALPHA * accuracy + (1 - ALPHA) * scoreBefore;

  // Update reputation.
  rep.score = scoreAfter;
  rep.history.push({
    step,
    score: scoreAfter,
    error: relativeError,
    settledAt: new Date().toISOString(),
  });

  // Move post from pending to settled.
  state.pendingPosts.delete(postId);
  state.settledPosts.push(post);

  // Generate mock settlement deploy hash.
  const deployHash = `0x${Buffer.from(`settle-${postId}-${Date.now()}`).toString("hex").slice(0, 64).padEnd(64, "0")}`;

  return {
    postId,
    postedValue: post.value,
    groundTruth,
    error,
    relativeError,
    scoreBefore,
    scoreAfter,
    isMiss,
    deployHash,
  };
}

// ── Query Pricing ──────────────────────────────────────────────────────────

/**
 * Compute the per-query price based on the agent's reputation.
 * Higher reputation = higher price (the oracle earns more).
 */
export function getQueryPrice(reputation: number): string {
  const price = BASE_QUERY_PRICE * reputation;
  return `$${price.toFixed(6)}`;
}

/**
 * Get the price in numeric form.
 */
export function getQueryPriceNumeric(reputation: number): number {
  return BASE_QUERY_PRICE * reputation;
}

// ── Exported Constants ─────────────────────────────────────────────────────

export const REPUTATION_CONSTANTS = {
  ALPHA,
  INITIAL_SCORE,
  MISS_THRESHOLD,
  BASE_QUERY_PRICE,
} as const;
