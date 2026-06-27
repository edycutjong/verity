// Verity domain model — shared by the core modules, API routes, and the UI.
// Mirrors the on-chain Verity reputation registry (see contract/src/verity.rs).

// ── Source Readings ────────────────────────────────────────────────────────

export interface SourceReading {
  /** Source identifier (e.g., "source_a", "source_b", "source_c"). */
  sourceId: string;
  /** The value reported by this source. */
  value: number;
  /** ISO 8601 timestamp of the reading. */
  timestamp: string;
  /** Whether this source is considered reliable (for reasoning context). */
  reliable: boolean;
}

export interface SourceTimeline {
  /** Asset identifier (e.g., "XAU"). */
  asset: string;
  /** Timeline of source readings per step. */
  steps: SourceStep[];
}

export interface SourceStep {
  /** Step label (e.g., "t0", "t1", "t2", "t3"). */
  label: string;
  /** All source readings at this step. */
  readings: SourceReading[];
}

// ── Agent Decision ─────────────────────────────────────────────────────────

export type AgentAction = "post" | "abstain";

export interface AgentDecision {
  /** What the agent decided to do. */
  action: AgentAction;
  /** The value the agent posts (undefined if abstain). */
  postedValue?: number;
  /** Calibrated confidence (0–1, in basis points on-chain). */
  confidence?: number;
  /** Natural-language rationale explaining the decision. */
  rationale: string;
  /** Which sources were down-weighted or flagged. */
  flaggedSources: string[];
  /** Deterministic baseline (median of reliable sources). */
  deterministicBaseline: number;
}

// ── Expected Decision (for fixture verification) ───────────────────────────

export interface ExpectedDecision {
  /** Step label. */
  step: string;
  /** Expected action. */
  expectedAction: AgentAction;
  /** Expected flagged sources (if any). */
  expectedFlagged: string[];
  /** Brief description of what should happen. */
  description: string;
}

// ── Oracle Post ────────────────────────────────────────────────────────────

export interface OraclePost {
  /** Unique post identifier. */
  postId: string;
  /** Asset being priced. */
  asset: string;
  /** The posted value. */
  value: number;
  /** Confidence (0–1). */
  confidence: number;
  /** Keccak-256 hash of the rationale (stored on-chain). */
  rationaleHash: string;
  /** Full rationale text (stored off-chain). */
  rationale: string;
  /** Agent's public key. */
  agentKey: string;
  /** Deploy hash of the on-chain post_value transaction. */
  deployHash: string;
  /** ISO 8601 timestamp. */
  postedAt: string;
}

// ── Ground Truth ───────────────────────────────────────────────────────────

export interface GroundTruth {
  /** Step label. */
  step: string;
  /** The true value. */
  trueValue: number;
  /** ISO 8601 timestamp. */
  arrivedAt: string;
}

// ── Reputation ─────────────────────────────────────────────────────────────

export interface ReputationScore {
  /** The agent's public key. */
  agentKey: string;
  /** Current score (0–1). */
  score: number;
  /** History of score changes. */
  history: ReputationEntry[];
}

export interface ReputationEntry {
  /** Step label. */
  step: string;
  /** Score after this settlement. */
  score: number;
  /** Error magnitude at this step. */
  error: number;
  /** ISO 8601 timestamp. */
  settledAt: string;
}

// ── Settlement ─────────────────────────────────────────────────────────────

export interface SettlementResult {
  /** Post ID being settled. */
  postId: string;
  /** The posted value. */
  postedValue: number;
  /** The ground truth value. */
  groundTruth: number;
  /** Absolute error. */
  error: number;
  /** Relative error (0–1). */
  relativeError: number;
  /** Reputation score before settlement. */
  scoreBefore: number;
  /** Reputation score after settlement. */
  scoreAfter: number;
  /** Whether the error exceeded the threshold (a "miss"). */
  isMiss: boolean;
  /** Deploy hash of the settle transaction. */
  deployHash: string;
}

// ── x402 ───────────────────────────────────────────────────────────────────

export interface X402Challenge {
  /** HTTP status code (always 402). */
  status: 402;
  /** Payment scheme. */
  scheme: "exact";
  /** CEP-18 asset package hash. */
  asset: string;
  /** Price (scales with reputation). */
  price: string;
  /** Network (CAIP-2). */
  network: string;
  /** Payee address. */
  payTo: string;
}

export interface X402Payment {
  /** EIP-712 typed-data signature (hex). */
  signature: string;
  /** Payer public key. */
  payer: string;
  /** Amount paid. */
  amount: string;
}

export interface X402Receipt {
  /** Whether the payment was successful. */
  success: boolean;
  /** Settlement deploy hash. */
  settlementHash: string;
  /** The oracle value returned after payment. */
  value?: number;
  /** The agent's reputation at time of query. */
  reputation?: number;
}

// ── Consumer LTV Panel ─────────────────────────────────────────────────────

export interface ConsumerLTVState {
  /** Current LTV ratio (0–1). */
  ltvRatio: number;
  /** Oracle reputation influencing LTV. */
  oracleReputation: number;
  /** Base LTV (before reputation adjustment). */
  baseLTV: number;
  /** Whether LTV was tightened due to low reputation. */
  tightened: boolean;
}

// ── Demo Timeline ──────────────────────────────────────────────────────────

export interface DemoStep {
  /** Step label (e.g., "t0", "t1", "t2", "t3"). */
  label: string;
  /** Description of what happens. */
  description: string;
  /** Expected post (if any). */
  expectedPost?: {
    value: number;
    confidence: number;
  };
  /** Expected ground truth. */
  groundTruth?: number;
  /** Expected reputation direction. */
  reputationDirection: "up" | "down" | "neutral";
  /** Expected query price change. */
  priceDirection: "up" | "down" | "neutral";
}
