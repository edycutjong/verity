# Verity — Proof-of-Production Plan

## Live URL
- **Frontend:** `https://verity-vouch.vercel.app` (Vercel) — live credit-score dashboard + x402 pay panel against Casper Testnet.

## On-chain deployment (hard gate)
- **Network:** Casper **Testnet** (`casper:casper-test`).
- **Contract:** Odra reputation registry — address in README.
- **Transactions produced:**
  1. `post_value` → real posting tx (deploy hash per post).
  2. **x402 settlement** → real CEP-18 micropayment settled by the CSPR.cloud facilitator (deploy hash per paid query).
  3. `settle` → reputation rescore tx.
- **Explorer:** all linked on `testnet.cspr.live`.

## Published artifacts
- **npm:** `@vouch/x402-casper-js` — a thin JS client/server for the CSPR.cloud x402 facilitator (402 handshake + EIP-712 auth). **This is genuinely missing in the ecosystem (only a Go SDK exists)** — high ecosystem-impact signal, reusable by every Casper agent dev.
- **GitHub:** open-source repo, MIT, with `cargo-odra` registry + the Go fallback service.

## Test targets
- **≥55 tests**, counted in README.
  - Contract: settlement math (EWMA), score monotonicity, only-settlement-writes-score.
  - x402: 402 challenge shape, EIP-712 payload correctness, verify/settle handling, replay protection.
  - Oracle: confidence calibration on fixtures.
- Coverage ≥70% on the x402 client/server.

## Benchmark
- `scripts/bench.ts` → x402 round-trip latency (402→pay→200) and post latency, p50/p95, on stated hardware.

## Verify
- `scripts/verify_reputation.ts` → recomputed score == on-chain `get_reputation`.
- `scripts/x402_roundtrip.ts` → prints a real settlement deploy hash.
- `scripts/check_submission_readiness.ts` → fails on placeholders / missing hashes.

## Long-term / impact
- Verity + the `@vouch/x402-casper-js` package position Vouch as the team that made x402 usable from JS on Casper. Roadmap: multi-asset oracle network, reputation-weighted price discovery, staking/slashing, mainnet.
- This is the project that taps the **$100k x402 ecosystem-credit** pool — but only after the spine is proven (hence build-last). Socials: X/@VouchOnCasper.
