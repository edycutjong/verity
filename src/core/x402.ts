// x402 client/server stubs — the Casper x402 facilitator layer.
// Implements the 402 → EIP-712 pay → 200 flow against the CSPR.cloud facilitator.
// In production, replace stubs with real facilitator REST calls.

import { createHash } from "node:crypto";
import type { X402Challenge, X402Payment, X402Receipt } from "./types";

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_NETWORK = "casper:casper-test";
const DEFAULT_SCHEME = "exact" as const;

// ── Server Side: Create 402 Challenge ──────────────────────────────────────

/**
 * Create a 402 Payment Required challenge for an oracle value read.
 */
export function create402Challenge(
  price: string,
  asset: string,
  payTo: string,
  network: string = DEFAULT_NETWORK,
): X402Challenge {
  return {
    status: 402,
    scheme: DEFAULT_SCHEME,
    asset,
    price,
    network,
    payTo,
  };
}

// ── Client Side: Sign EIP-712 Payment ──────────────────────────────────────

/**
 * Sign an EIP-712 typed-data payment authorization for the x402 facilitator.
 * In production: casper-eip-712 provides `hashTypedData` + `recoverTypedDataSigner`
 * but does NOT have a `signTypedData` function. Use ethers or viem for actual signing:
 *   import { ethers } from 'ethers';
 *   const wallet = new ethers.Wallet(privateKey);
 *   const signature = await wallet.signTypedData(domain, types, message);
 *   Then verify with recoverTypedDataSigner from casper-eip-712.
 * Demo: simulates a valid signature.
 */
export function signPayment(
  payer: string,
  amount: string,
  payTo: string,
  asset: string,
): X402Payment {
  // Simulate EIP-712 typed-data signature.
  const payload = `${payer}|${amount}|${payTo}|${asset}|${Date.now()}`;
  const signature = `0x${createHash("sha256").update(payload).digest("hex")}`;

  return {
    signature,
    payer,
    amount,
  };
}

// ── Server Side: Verify Payment ────────────────────────────────────────────

/**
 * Verify an x402 payment against the facilitator.
 * In production: POST to facilitator /verify endpoint.
 * Demo: validates signature format.
 */
export function verifyPayment(payment: X402Payment): boolean {
  if (!payment.signature.startsWith("0x") || payment.signature.length !== 66) {
    return false;
  }
  if (!payment.payer || !payment.amount) {
    return false;
  }
  return true;
}

// ── Server Side: Settle Payment ────────────────────────────────────────────

/**
 * Settle an x402 payment via the facilitator.
 * In production: POST to facilitator /settle endpoint → on-chain CEP-18 transfer.
 * Demo: generates a mock settlement deploy hash.
 */
export function settlePayment(payment: X402Payment): X402Receipt {
  if (!verifyPayment(payment)) {
    return { success: false, settlementHash: "" };
  }

  // Generate mock settlement deploy hash.
  const hashInput = `settle-x402-${payment.payer}-${payment.amount}-${Date.now()}`;
  const settlementHash = `0x${createHash("sha256").update(hashInput).digest("hex")}`;

  return {
    success: true,
    settlementHash,
  };
}

// ── Full Round-Trip ────────────────────────────────────────────────────────

export interface X402RoundTripResult {
  challenge: X402Challenge;
  payment: X402Payment;
  receipt: X402Receipt;
  latencyMs: number;
}

/**
 * Execute a full x402 round-trip: 402 → pay → settle → 200.
 */
export function executeRoundTrip(
  price: string,
  asset: string,
  payTo: string,
  payer: string,
): X402RoundTripResult {
  const start = performance.now();

  // 1. Server creates 402 challenge.
  const challenge = create402Challenge(price, asset, payTo);

  // 2. Client signs payment.
  const payment = signPayment(payer, price, payTo, asset);

  // 3. Server verifies + settles.
  const receipt = settlePayment(payment);

  const latencyMs = performance.now() - start;

  return { challenge, payment, receipt, latencyMs };
}

/**
 * Detect replay attempts (same signature used twice).
 * In production: maintain a server-side nonce/signature set.
 */
export function isReplay(
  signature: string,
  usedSignatures: Set<string>,
): boolean {
  if (usedSignatures.has(signature)) return true;
  usedSignatures.add(signature);
  return false;
}
