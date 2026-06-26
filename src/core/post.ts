// Oracle posting loop — signs and posts values to the Odra registry via casper-js-sdk (PEM key).
// In production: uses casper-js-sdk Keys.Ed25519.loadKeyPairFromPrivateFile() + TransactionV1.
// Demo: generates deterministic mock deploy hashes.

import { createHash } from "node:crypto";
import type { OraclePost, AgentDecision } from "./types";

// ── Post Counter ───────────────────────────────────────────────────────────

let postCounter = 0;

/**
 * Reset the post counter (for testing).
 */
export function resetPostCounter(): void {
  postCounter = 0;
}

// ── Rationale Hash ─────────────────────────────────────────────────────────

/**
 * Hash a rationale string for on-chain storage.
 * Uses SHA-256 (in production: keccak-256 for EVM compatibility).
 */
export function hashRationale(rationale: string): string {
  return `0x${createHash("sha256").update(rationale).digest("hex")}`;
}

// ── Post Value ─────────────────────────────────────────────────────────────

/**
 * Post a value to the on-chain Odra reputation registry.
 * In production: casper-js-sdk `post_value(asset, value, confidence_bps, rationale_hash)` via PEM key.
 * Demo: generates a mock deploy hash and returns the full post record.
 */
export function postValue(
  asset: string,
  decision: AgentDecision,
  agentKey: string,
): OraclePost {
  if (decision.action === "abstain" || decision.postedValue === undefined) {
    throw new Error("Cannot post an abstention — the agent decided not to post.");
  }

  const postId = `post-${asset}-${++postCounter}`;
  const rationaleHash = hashRationale(decision.rationale);

  // Generate mock deploy hash (in production: real casper-js-sdk TransactionV1).
  const deployInput = `post-${postId}-${decision.postedValue}-${Date.now()}`;
  const deployHash = `0x${createHash("sha256").update(deployInput).digest("hex")}`;

  return {
    postId,
    asset,
    value: decision.postedValue,
    confidence: decision.confidence!,
    rationaleHash,
    rationale: decision.rationale,
    agentKey,
    deployHash,
    postedAt: new Date().toISOString(),
  };
}

// ── Batch Post ─────────────────────────────────────────────────────────────

/**
 * Post multiple values in sequence (used by the seed script).
 */
export function postAll(
  asset: string,
  decisions: AgentDecision[],
  agentKey: string,
): OraclePost[] {
  return decisions
    .filter((d) => d.action === "post")
    .map((d) => postValue(asset, d, agentKey));
}

/**
 * Verify a rationale hash matches the full rationale text.
 */
export function verifyRationale(rationale: string, rationaleHash: string): boolean {
  return hashRationale(rationale) === rationaleHash;
}
