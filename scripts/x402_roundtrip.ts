// Full x402 round-trip: 402 → EIP-712 pay → settle → 200.
// In production: hits the real CSPR.cloud facilitator.

import { executeRoundTrip } from "../src/core/x402";
import { getQueryPrice, REPUTATION_CONSTANTS } from "../src/core/reputation";

async function main() {
  console.log("💸 Verity x402 round-trip\n");

  const reputation = REPUTATION_CONSTANTS.INITIAL_SCORE;
  const price = getQueryPrice(reputation);

  console.log(`  Reputation: ${(reputation * 100).toFixed(1)}`);
  console.log(`  Query price: ${price}`);
  console.log();

  const result = executeRoundTrip(
    price,
    "hash-<CEP-18 package hash>",
    "0x<payee-address>",
    "0x<consumer-address>",
  );

  console.log("── 402 Challenge ──");
  console.log(`  scheme: ${result.challenge.scheme}`);
  console.log(`  price: ${result.challenge.price}`);
  console.log(`  network: ${result.challenge.network}`);
  console.log();

  console.log("── Payment ──");
  console.log(`  signature: ${result.payment.signature.slice(0, 24)}…`);
  console.log(`  payer: ${result.payment.payer}`);
  console.log();

  console.log("── Settlement ──");
  if (result.receipt.success) {
    console.log(`  ✓ success`);
    console.log(`  deploy hash: ${result.receipt.settlementHash.slice(0, 24)}…`);
  } else {
    console.log("  ✗ failed");
  }

  console.log(`\n  Latency: ${result.latencyMs.toFixed(2)}ms`);

  // TODO: In production, hit the real facilitator:
  //   POST ${X402_FACILITATOR_URL}/verify
  //   POST ${X402_FACILITATOR_URL}/settle
  console.log("\n⚠ Using simulated facilitator — see BUILD_PLAN Day 2.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
