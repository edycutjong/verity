# Verity ⚖️ — Pitch Deck

> *RWA oracles that bleed when they're wrong.*

---

## Slide 1: Title & Hook
**VERITY ⚖️** — RWA oracles that bleed when they're wrong.
Part of the **Vouch** suite. Speaker Notes: "What if your oracle had skin in the game? When Verity is wrong, its reputation drops — visibly, on-chain."

## Slide 2: The Problem
**Oracles face zero penalty for bad data.** Static trust assumptions, no accountability, no price signal for data quality.

## Slide 3: The Solution
**EWMA-based on-chain reputation** — accuracy directly translates to score (0–10000 bps). Query price scales with reputation.

## Slide 4: Core Flow
Source aggregation → AI reasoning → Value posted → Settlement → EWMA update → x402 pricing adjustment

## Slide 5: Architecture
Next.js 16 + Odra (Rust) + x402 micropayments + CSPR.cloud + casper-eip-712

## Slide 6: Demo Highlights
Oracle Terminal: live x402 pay-to-read round-trip (402 → EIP-712 → 200). The engineered miss at t2.

## Slide 7: Casper Integration
Odra contract, casper-js-sdk, x402 facilitator, CSPR.cloud, casper-eip-712

## Slide 8: Testnet Proof
Contract: hash-657a83..., Install TX: 66b6f13a..., CEP-18: hash-541069...

## Slide 9: Competitive Edge
Only oracle where reputation = price. Bad data → lower revenue → market discipline.

## Slide 10: Roadmap
Now: Testnet prototype → 30d: Multi-source aggregation → 60d: Mainnet → 90d: Cross-chain oracle federation

## Slide 11: Team
Edy Cu — Solo dev, 60+ hackathon projects, Vouch suite builder

## Slide 12: Conclusion
"The first oracle that pays the price for being wrong."
