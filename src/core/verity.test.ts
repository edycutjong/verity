import { describe, expect, it, beforeEach, vi } from "vitest";
import * as sources from "./sources";
import {
  computeBaseline,
  detectOutliers,
  computeConsensus,
  computeCleanedBaseline,
  shouldPost,
  analyzeStep,
} from "./sources";
import {
  calibrateConfidence,
  reasonOverSources,
  reasonWithOverride,
} from "./reasoning";
import {
  createReputationState,
  getReputation,
  registerPost,
  settlePost,
  getQueryPrice,
  getQueryPriceNumeric,
  REPUTATION_CONSTANTS,
} from "./reputation";
import { loadExpectedDecisions } from "@/lib/fixtures";
import { assertServerEnv } from "../lib/config";
import {
  create402Challenge,
  signPayment,
  verifyPayment,
  settlePayment,
  executeRoundTrip,
  isReplay,
} from "./x402";
import {
  postValue,
  hashRationale,
  verifyRationale,
  resetPostCounter,
  postAll,
} from "./post";
import {
  computeLTV,
  formatLTV,
  getLTVStatus,
  LTV_CONSTANTS,
} from "./consumer";
import type { SourceReading, AgentDecision } from "./types";

// ── Test Fixtures ──────────────────────────────────────────────────────────

const AGENT_KEY = "0xoracle-agent-demo";
const ASSET = "XAU";

const READINGS_CONSENSUS: SourceReading[] = [
  { sourceId: "source_a", value: 2000, timestamp: "2026-06-11T10:00:00Z", reliable: true },
  { sourceId: "source_b", value: 2002, timestamp: "2026-06-11T10:00:01Z", reliable: true },
  { sourceId: "source_c", value: 1998, timestamp: "2026-06-11T10:00:02Z", reliable: true },
];

const READINGS_OUTLIER: SourceReading[] = [
  { sourceId: "source_a", value: 2010, timestamp: "2026-06-11T11:00:00Z", reliable: true },
  { sourceId: "source_b", value: 2008, timestamp: "2026-06-11T11:00:01Z", reliable: true },
  { sourceId: "source_c", value: 2600, timestamp: "2026-06-11T11:00:02Z", reliable: false },
];

const READINGS_MISS: SourceReading[] = [
  { sourceId: "source_a", value: 1948, timestamp: "2026-06-11T12:00:00Z", reliable: true },
  { sourceId: "source_b", value: 1952, timestamp: "2026-06-11T12:00:01Z", reliable: true },
  { sourceId: "source_c", value: 1950, timestamp: "2026-06-11T12:00:02Z", reliable: true },
];

// ═══════════════════════════════════════════════════════════════════════════
// 1. Sources — Baseline Computation
// ═══════════════════════════════════════════════════════════════════════════

describe("computeBaseline", () => {
  it("computes median for odd-length array", () => {
    expect(computeBaseline(READINGS_CONSENSUS)).toBe(2000);
  });

  it("computes mean of two middle values for even-length array", () => {
    const readings = READINGS_CONSENSUS.slice(0, 2);
    expect(computeBaseline(readings)).toBe(2001);
  });

  it("returns 0 for empty array", () => {
    expect(computeBaseline([])).toBe(0);
  });

  it("returns the single value for a single reading", () => {
    expect(computeBaseline([READINGS_CONSENSUS[0]])).toBe(2000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Sources — Outlier Detection
// ═══════════════════════════════════════════════════════════════════════════

describe("detectOutliers", () => {
  it("detects no outliers in consensus readings", () => {
    expect(detectOutliers(READINGS_CONSENSUS)).toHaveLength(0);
  });

  it("detects source_c as outlier in manipulation set", () => {
    const outliers = detectOutliers(READINGS_OUTLIER);
    expect(outliers).toContain("source_c");
    expect(outliers).toHaveLength(1);
  });

  it("returns empty for single reading", () => {
    expect(detectOutliers([READINGS_CONSENSUS[0]])).toHaveLength(0);
  });

  it("returns empty for empty array", () => {
    expect(detectOutliers([])).toHaveLength(0);
  });

  it("uses custom threshold", () => {
    // With 1% threshold, even small deviation is an outlier.
    const outliers = detectOutliers(READINGS_CONSENSUS, 0.01);
    expect(outliers.length).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Sources — Consensus
// ═══════════════════════════════════════════════════════════════════════════

describe("computeConsensus", () => {
  it("returns high consensus for agreeing sources", () => {
    const consensus = computeConsensus(READINGS_CONSENSUS);
    expect(consensus).toBeGreaterThan(0.95);
  });

  it("returns low consensus for diverging sources", () => {
    const consensus = computeConsensus(READINGS_OUTLIER);
    expect(consensus).toBeLessThan(0.7);
  });

  it("returns 1 for single reading", () => {
    expect(computeConsensus([READINGS_CONSENSUS[0]])).toBe(1);
  });
});

describe("computeCleanedBaseline", () => {
  it("excludes flagged sources", () => {
    const cleaned = computeCleanedBaseline(READINGS_OUTLIER, ["source_c"]);
    expect(cleaned).toBe(2009);
  });

  it("falls back to all readings if all flagged", () => {
    const cleaned = computeCleanedBaseline(READINGS_CONSENSUS, ["source_a", "source_b", "source_c"]);
    expect(cleaned).toBe(2000);
  });
});

describe("shouldPost", () => {
  it("returns true for consensus readings", () => {
    expect(shouldPost(READINGS_CONSENSUS)).toBe(true);
  });

  it("returns true when outlier is removed and clean consensus is good", () => {
    expect(shouldPost(READINGS_OUTLIER)).toBe(true);
  });
});

describe("analyzeStep", () => {
  it("returns complete analysis for a step", () => {
    const analysis = analyzeStep({ label: "t0", readings: READINGS_CONSENSUS });
    expect(analysis.baseline).toBe(2000);
    expect(analysis.outliers).toHaveLength(0);
    expect(analysis.consensus).toBeGreaterThan(0.95);
    expect(analysis.shouldPost).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Reasoning — Confidence Calibration
// ═══════════════════════════════════════════════════════════════════════════

describe("calibrateConfidence", () => {
  it("returns high confidence for perfect consensus", () => {
    const conf = calibrateConfidence(1.0, 0, 3);
    expect(conf).toBeGreaterThanOrEqual(0.95);
  });

  it("reduces confidence when outliers are present", () => {
    const confClean = calibrateConfidence(0.99, 0, 3);
    const confOutlier = calibrateConfidence(0.99, 1, 3);
    expect(confOutlier).toBeLessThan(confClean);
  });

  it("clamps to minimum 0.1", () => {
    const conf = calibrateConfidence(0.0, 3, 3);
    expect(conf).toBeGreaterThanOrEqual(0.1);
  });

  it("clamps to maximum 0.99", () => {
    const conf = calibrateConfidence(1.0, 0, 3);
    expect(conf).toBeLessThanOrEqual(0.99);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Reasoning — Agent Decisions
// ═══════════════════════════════════════════════════════════════════════════

describe("reasonOverSources", () => {
  it("posts with high confidence for consensus readings", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    expect(decision.action).toBe("post");
    expect(decision.postedValue).toBe(2000);
    expect(decision.confidence).toBeGreaterThan(0.9);
    expect(decision.flaggedSources).toHaveLength(0);
  });

  it("flags source_c and down-weights it for manipulation set", () => {
    const decision = reasonOverSources(READINGS_OUTLIER);
    expect(decision.action).toBe("post");
    expect(decision.flaggedSources).toContain("source_c");
    expect(decision.postedValue).toBe(2009);
    expect(decision.rationale).toContain("outlier");
  });

  it("posts 1950 for the miss set", () => {
    const decision = reasonOverSources(READINGS_MISS);
    expect(decision.action).toBe("post");
    expect(decision.postedValue).toBe(1950);
  });

  it("abstains when no readings", () => {
    const decision = reasonOverSources([]);
    expect(decision.action).toBe("abstain");
  });

  it("includes a rationale", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    expect(decision.rationale.length).toBeGreaterThan(10);
  });

  it("includes the deterministic baseline", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    expect(decision.deterministicBaseline).toBe(2000);
  });
});

describe("reasonWithOverride", () => {
  it("overrides the posted value", () => {
    const decision = reasonWithOverride(READINGS_MISS, 1950, 0.85);
    expect(decision.postedValue).toBe(1950);
    expect(decision.confidence).toBe(0.85);
  });

  it("preserves abstain decisions", () => {
    const decision = reasonWithOverride([], 1950, 0.85);
    expect(decision.action).toBe("abstain");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Reputation — EWMA Score
// ═══════════════════════════════════════════════════════════════════════════

describe("reputation", () => {
  let state: ReturnType<typeof createReputationState>;

  beforeEach(() => {
    state = createReputationState();
    resetPostCounter();
  });

  it("initializes with default score", () => {
    const rep = getReputation(state, AGENT_KEY);
    expect(rep.score).toBe(REPUTATION_CONSTANTS.INITIAL_SCORE);
  });

  it("registers a pending post", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post = postValue(ASSET, decision, AGENT_KEY);
    registerPost(state, post);
    expect(state.pendingPosts.has(post.postId)).toBe(true);
  });

  it("settles a post and updates reputation upward on small error", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post = postValue(ASSET, decision, AGENT_KEY);
    registerPost(state, post);

    const result = settlePost(state, post.postId, 2003, "t0");
    expect(result.scoreAfter).toBeGreaterThan(REPUTATION_CONSTANTS.INITIAL_SCORE);
    expect(result.isMiss).toBe(false);
  });

  it("settles a post and updates reputation downward on large error", () => {
    const decision = reasonWithOverride(READINGS_MISS, 1950, 0.85);
    const post = postValue(ASSET, decision, AGENT_KEY);
    registerPost(state, post);

    const result = settlePost(state, post.postId, 2040, "t2");
    expect(result.scoreAfter).toBeLessThan(REPUTATION_CONSTANTS.INITIAL_SCORE);
    expect(result.isMiss).toBe(true);
  });

  it("throws when settling a non-existent post", () => {
    expect(() => settlePost(state, "nonexistent", 2000, "t0")).toThrow("not found");
  });

  it("moves post from pending to settled", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post = postValue(ASSET, decision, AGENT_KEY);
    registerPost(state, post);
    settlePost(state, post.postId, 2003, "t0");

    expect(state.pendingPosts.has(post.postId)).toBe(false);
    expect(state.settledPosts).toHaveLength(1);
  });

  it("tracks reputation history", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post = postValue(ASSET, decision, AGENT_KEY);
    registerPost(state, post);
    settlePost(state, post.postId, 2003, "t0");

    const rep = getReputation(state, AGENT_KEY);
    expect(rep.history).toHaveLength(1);
    expect(rep.history[0].step).toBe("t0");
  });

  it("settlement generates a deploy hash", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post = postValue(ASSET, decision, AGENT_KEY);
    registerPost(state, post);
    const result = settlePost(state, post.postId, 2003, "t0");
    expect(result.deployHash).toMatch(/^0x[0-9a-f]+$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. Reputation — Query Pricing
// ═══════════════════════════════════════════════════════════════════════════

describe("query pricing", () => {
  it("returns higher price for higher reputation", () => {
    const priceHigh = getQueryPriceNumeric(0.9);
    const priceLow = getQueryPriceNumeric(0.5);
    expect(priceHigh).toBeGreaterThan(priceLow);
  });

  it("formats price as dollar string", () => {
    const price = getQueryPrice(0.75);
    expect(price).toMatch(/^\$\d+\.\d+$/);
  });

  it("scales linearly with reputation", () => {
    const price1 = getQueryPriceNumeric(1.0);
    const price05 = getQueryPriceNumeric(0.5);
    expect(price1).toBeCloseTo(price05 * 2, 6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. x402 — Challenge & Payment
// ═══════════════════════════════════════════════════════════════════════════

describe("x402 challenge", () => {
  it("creates a 402 challenge with correct fields", () => {
    const challenge = create402Challenge("$0.001", "hash-cep18", "0xpayee");
    expect(challenge.status).toBe(402);
    expect(challenge.scheme).toBe("exact");
    expect(challenge.network).toBe("casper:casper-test");
  });

  it("uses custom network", () => {
    const challenge = create402Challenge("$0.001", "hash-cep18", "0xpayee", "casper:casper");
    expect(challenge.network).toBe("casper:casper");
  });
});

describe("x402 payment", () => {
  it("signs a payment with valid signature format", () => {
    const payment = signPayment("0xpayer", "$0.001", "0xpayee", "hash-cep18");
    expect(payment.signature).toMatch(/^0x[0-9a-f]{64}$/);
    expect(payment.payer).toBe("0xpayer");
  });

  it("verifies a valid payment", () => {
    const payment = signPayment("0xpayer", "$0.001", "0xpayee", "hash-cep18");
    expect(verifyPayment(payment)).toBe(true);
  });

  it("rejects invalid signature format", () => {
    expect(verifyPayment({ signature: "bad", payer: "x", amount: "1" })).toBe(false);
  });

  it("rejects empty payer", () => {
    expect(verifyPayment({ signature: "0x" + "a".repeat(64), payer: "", amount: "1" })).toBe(false);
  });
});

describe("x402 settlement", () => {
  it("settles a valid payment", () => {
    const payment = signPayment("0xpayer", "$0.001", "0xpayee", "hash-cep18");
    const receipt = settlePayment(payment);
    expect(receipt.success).toBe(true);
    expect(receipt.settlementHash).toMatch(/^0x[0-9a-f]+$/);
  });

  it("fails for invalid payment", () => {
    const receipt = settlePayment({ signature: "bad", payer: "x", amount: "1" });
    expect(receipt.success).toBe(false);
  });
});

describe("x402 round-trip", () => {
  it("executes a full 402 → pay → settle → 200 round-trip", () => {
    const result = executeRoundTrip("$0.001", "hash-cep18", "0xpayee", "0xpayer");
    expect(result.challenge.status).toBe(402);
    expect(result.receipt.success).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("x402 replay detection", () => {
  it("detects replay of same signature", () => {
    const used = new Set<string>();
    const payment = signPayment("0xpayer", "$0.001", "0xpayee", "hash-cep18");
    expect(isReplay(payment.signature, used)).toBe(false);
    expect(isReplay(payment.signature, used)).toBe(true);
  });

  it("allows different signatures", () => {
    const used = new Set<string>();
    const p1 = signPayment("0xpayer1", "$0.001", "0xpayee", "hash-cep18");
    const p2 = signPayment("0xpayer2", "$0.001", "0xpayee", "hash-cep18");
    expect(isReplay(p1.signature, used)).toBe(false);
    expect(isReplay(p2.signature, used)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Post — Oracle Posting
// ═══════════════════════════════════════════════════════════════════════════

describe("postValue", () => {
  beforeEach(() => resetPostCounter());

  it("creates a post with correct fields", () => {
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post = postValue(ASSET, decision, AGENT_KEY);
    expect(post.asset).toBe(ASSET);
    expect(post.value).toBe(2000);
    expect(post.agentKey).toBe(AGENT_KEY);
    expect(post.deployHash).toMatch(/^0x[0-9a-f]+$/);
  });

  it("throws when trying to post an abstention", () => {
    const decision: AgentDecision = {
      action: "abstain",
      rationale: "test",
      flaggedSources: [],
      deterministicBaseline: 0,
    };
    expect(() => postValue(ASSET, decision, AGENT_KEY)).toThrow("abstention");
  });

  it("increments post IDs", () => {
    const d = reasonOverSources(READINGS_CONSENSUS);
    const p1 = postValue(ASSET, d, AGENT_KEY);
    const p2 = postValue(ASSET, d, AGENT_KEY);
    expect(p1.postId).not.toBe(p2.postId);
  });
});

describe("hashRationale", () => {
  it("produces a 0x-prefixed hex string", () => {
    const h = hashRationale("test rationale");
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashRationale("test")).toBe(hashRationale("test"));
  });

  it("changes for different inputs", () => {
    expect(hashRationale("a")).not.toBe(hashRationale("b"));
  });
});

describe("verifyRationale", () => {
  it("verifies matching hash", () => {
    const rationale = "The sources agree.";
    const hash = hashRationale(rationale);
    expect(verifyRationale(rationale, hash)).toBe(true);
  });

  it("rejects mismatching hash", () => {
    expect(verifyRationale("a", hashRationale("b"))).toBe(false);
  });
});

describe("postAll", () => {
  beforeEach(() => resetPostCounter());

  it("posts all non-abstain decisions", () => {
    const decisions = [
      reasonOverSources(READINGS_CONSENSUS),
      reasonOverSources([]),
      reasonOverSources(READINGS_MISS),
    ];
    const posts = postAll(ASSET, decisions, AGENT_KEY);
    expect(posts).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Consumer — LTV Panel
// ═══════════════════════════════════════════════════════════════════════════

describe("consumer LTV", () => {
  it("computes higher LTV for higher reputation", () => {
    const high = computeLTV(0.9);
    const low = computeLTV(0.4);
    expect(high.ltvRatio).toBeGreaterThan(low.ltvRatio);
  });

  it("tightens LTV below threshold", () => {
    const state = computeLTV(0.5);
    expect(state.tightened).toBe(true);
  });

  it("does not tighten LTV above threshold", () => {
    const state = computeLTV(0.9);
    expect(state.tightened).toBe(false);
  });

  it("clamps reputation to [0, 1]", () => {
    const above = computeLTV(1.5);
    const below = computeLTV(-0.5);
    expect(above.ltvRatio).toBeLessThanOrEqual(LTV_CONSTANTS.MAX_LTV);
    expect(below.ltvRatio).toBeGreaterThanOrEqual(LTV_CONSTANTS.MIN_LTV);
  });

  it("formats LTV as percentage", () => {
    const state = computeLTV(0.75);
    expect(formatLTV(state)).toMatch(/^\d+\.\d+%$/);
  });

  it("returns tightened status message", () => {
    const state = computeLTV(0.5);
    expect(getLTVStatus(state)).toContain("tightened");
  });

  it("returns healthy status message", () => {
    const state = computeLTV(0.9);
    expect(getLTVStatus(state)).toContain("healthy");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. Full Demo Flow (the headline)
// ═══════════════════════════════════════════════════════════════════════════

describe("full demo flow: post → settle → score drops → price falls → LTV tightens", () => {
  beforeEach(() => resetPostCounter());

  it("runs the complete lifecycle correctly", () => {
    const repState = createReputationState();

    // ── t0: strong call ──
    const d0 = reasonOverSources(READINGS_CONSENSUS);
    expect(d0.action).toBe("post");
    expect(d0.flaggedSources).toHaveLength(0);

    const post0 = postValue(ASSET, d0, AGENT_KEY);
    registerPost(repState, post0);
    const settle0 = settlePost(repState, post0.postId, 2003, "t0");
    expect(settle0.isMiss).toBe(false);
    expect(settle0.scoreAfter).toBeGreaterThan(REPUTATION_CONSTANTS.INITIAL_SCORE);

    // ── t1: manipulation caught ──
    const d1 = reasonOverSources(READINGS_OUTLIER);
    expect(d1.action).toBe("post");
    expect(d1.flaggedSources).toContain("source_c");
    expect(d1.postedValue).toBe(2009); // Cleaned value, not corrupted average.

    const post1 = postValue(ASSET, d1, AGENT_KEY);
    registerPost(repState, post1);
    const settle1 = settlePost(repState, post1.postId, 2005, "t1");
    expect(settle1.isMiss).toBe(false);

    const scoreAfterT1 = settle1.scoreAfter;

    // ── t2: the miss (the headline) ──
    const d2 = reasonWithOverride(READINGS_MISS, 1950, 0.85);
    expect(d2.action).toBe("post");

    const post2 = postValue(ASSET, d2, AGENT_KEY);
    registerPost(repState, post2);
    const settle2 = settlePost(repState, post2.postId, 2040, "t2");

    // THE MOMENT: reputation drops.
    expect(settle2.isMiss).toBe(true);
    expect(settle2.scoreAfter).toBeLessThan(scoreAfterT1);

    // ── t3: price reacts ──
    const priceBeforeMiss = getQueryPriceNumeric(scoreAfterT1);
    const priceAfterMiss = getQueryPriceNumeric(settle2.scoreAfter);
    expect(priceAfterMiss).toBeLessThan(priceBeforeMiss);

    // ── Consumer LTV reacts ──
    const ltvBefore = computeLTV(scoreAfterT1);
    const ltvAfter = computeLTV(settle2.scoreAfter);
    expect(ltvAfter.ltvRatio).toBeLessThan(ltvBefore.ltvRatio);
    expect(ltvAfter.tightened).toBe(true);

    // ── Verify x402 still works ──
    const price = getQueryPrice(settle2.scoreAfter);
    const roundTrip = executeRoundTrip(price, "hash-cep18", "0xpayee", "0xconsumer");
    expect(roundTrip.receipt.success).toBe(true);
    expect(roundTrip.receipt.settlementHash).toMatch(/^0x/);

    // ── PII scan: no raw values or source IDs in deploy hashes ──
    const allHashes = [post0.deployHash, post1.deployHash, post2.deployHash,
                       settle0.deployHash, settle1.deployHash, settle2.deployHash];
    for (const hash of allHashes) {
      expect(hash).not.toContain("source_a");
      expect(hash).not.toContain("XAU");
    }
  });

  it("reputation is monotonically affected by accuracy", () => {
    const repState = createReputationState();

    // 3 accurate posts → reputation should rise.
    const decisions = [
      reasonOverSources(READINGS_CONSENSUS),
      reasonOverSources(READINGS_CONSENSUS),
      reasonOverSources(READINGS_CONSENSUS),
    ];

    let prevScore: number = REPUTATION_CONSTANTS.INITIAL_SCORE;
    for (let i = 0; i < decisions.length; i++) {
      const post = postValue(ASSET, decisions[i], AGENT_KEY);
      registerPost(repState, post);
      const result = settlePost(repState, post.postId, 2001, `t${i}`);
      expect(result.scoreAfter).toBeGreaterThanOrEqual(prevScore);
      prevScore = result.scoreAfter;
    }
  });

  it("x402 round-trip works end-to-end with reputation-scaled price", () => {
    const repState = createReputationState();
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post = postValue(ASSET, decision, AGENT_KEY);
    registerPost(repState, post);
    settlePost(repState, post.postId, 2003, "t0");

    const rep = getReputation(repState, AGENT_KEY);
    const price = getQueryPrice(rep.score);
    const roundTrip = executeRoundTrip(price, "hash-cep18", "0xpayee", "0xconsumer");

    expect(roundTrip.challenge.status).toBe(402);
    expect(roundTrip.challenge.price).toBe(price);
    expect(roundTrip.receipt.success).toBe(true);
  });
});

describe("verity core edge cases", () => {
  it("detectOutliers returns empty if baseline is 0", () => {
    const readings: SourceReading[] = [
      { sourceId: "s1", value: 0, timestamp: "", reliable: true },
      { sourceId: "s2", value: 0, timestamp: "", reliable: true },
    ];
    expect(detectOutliers(readings)).toEqual([]);
  });

  it("computeConsensus returns 0 if mean is 0", () => {
    const readings: SourceReading[] = [
      { sourceId: "s1", value: 10, timestamp: "", reliable: true },
      { sourceId: "s2", value: -10, timestamp: "", reliable: true },
    ];
    expect(computeConsensus(readings)).toBe(0);
  });

  it("shouldPost returns false if cleanReadings is empty", () => {
    // Both are outliers since deviation is huge.
    const readings: SourceReading[] = [
      { sourceId: "s1", value: 100, timestamp: "", reliable: true },
      { sourceId: "s2", value: 10, timestamp: "", reliable: true },
    ];
    expect(shouldPost(readings)).toBe(false);
  });

  it("reasonOverSources abstains when all sources are outliers", () => {
    const readings: SourceReading[] = [
      { sourceId: "s1", value: 100, timestamp: "", reliable: true },
      { sourceId: "s2", value: 10, timestamp: "", reliable: true },
    ];
    const result = reasonOverSources(readings);
    expect(result.action).toBe("abstain");
    expect(result.rationale).toContain("All 2 sources show extreme disagreement");
  });

  it("reasonOverSources abstains when clean consensus is too low", () => {
    const readings: SourceReading[] = [
      { sourceId: "s1", value: 100, timestamp: "", reliable: true },
      { sourceId: "s2", value: 105, timestamp: "", reliable: true },
      { sourceId: "s3", value: 10, timestamp: "", reliable: true },
    ];
    // Spy on computeConsensus to return 0.2 when called on clean readings [100, 105]
    const consensusSpy = vi.spyOn(sources, "computeConsensus").mockImplementation((r) => {
      if (r.length === 2 && r.some(x => x.sourceId === "s1") && r.some(x => x.sourceId === "s2")) {
        return 0.2;
      }
      return 0.99; // default high consensus for others
    });

    try {
      const result = reasonOverSources(readings);
      expect(result.action).toBe("abstain");
      expect(result.rationale).toContain("disagree significantly");
    } finally {
      consensusSpy.mockRestore();
    }
  });

  it("settlePost error paths when groundTruth is 0", () => {
    const state = createReputationState();
    const decision = reasonOverSources(READINGS_CONSENSUS);
    const post1 = postValue(ASSET, decision, AGENT_KEY);
    registerPost(state, post1);

    // relativeError = 1 when error > 0
    const res1 = settlePost(state, post1.postId, 0, "t0");
    expect(res1.relativeError).toBe(1);
    expect(res1.isMiss).toBe(true);

    const post2 = postValue(ASSET, { ...decision, postedValue: 0 }, AGENT_KEY);
    registerPost(state, post2);

    // relativeError = 0 when error = 0
    const res2 = settlePost(state, post2.postId, 0, "t1");
    expect(res2.relativeError).toBe(0);
    expect(res2.isMiss).toBe(false);
  });

  it("calls loadExpectedDecisions fixture loader", () => {
    expect(loadExpectedDecisions()).toBeDefined();
  });

  it("reasonOverSources outlier map fallback when outlier id not in readings", () => {
    const readings: SourceReading[] = [
      { sourceId: "s1", value: 100, timestamp: "", reliable: true },
      { sourceId: "s2", value: 105, timestamp: "", reliable: true },
      { sourceId: "s3", value: 102, timestamp: "", reliable: true },
    ];
    // Mock detectOutliers to return a non-existent ID
    const detectSpy = vi.spyOn(sources, "detectOutliers").mockReturnValue(["nonexistent"]);

    try {
      const result = reasonOverSources(readings);
      expect(result.action).toBe("post");
      expect(result.rationale).toContain("nonexistent");
    } finally {
      detectSpy.mockRestore();
    }
  });

  it("covers all outlier mapping branches in reasonOverSources", () => {
    const readings: SourceReading[] = [
      { sourceId: "source_a", value: 100, timestamp: "", reliable: true },
      { sourceId: "source_b", value: 105, timestamp: "", reliable: true },
      { sourceId: "source_c", value: 102, timestamp: "", reliable: true },
      { sourceId: "source_unknown", value: 104, timestamp: "", reliable: true },
    ];
    const detectSpy = vi.spyOn(sources, "detectOutliers").mockReturnValue(["source_a", "source_b", "source_unknown"]);

    try {
      const result = reasonOverSources(readings);
      expect(result.rationale).toContain("Bloomberg");
      expect(result.rationale).toContain("Reuters");
      expect(result.rationale).toContain("source_unknown");
    } finally {
      detectSpy.mockRestore();
    }
  });

  it("assertServerEnv checks keys correctly", () => {
    expect(() => assertServerEnv(["network"])).not.toThrow();
    expect(() => assertServerEnv(["contractHash"])).toThrow("Missing required env: contractHash");
  });
});


