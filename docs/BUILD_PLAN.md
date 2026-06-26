# Verity — Build Plan

> **Build order: last.** Start only after Conclave (and ideally Bastion) are submitted — Verity reuses their CSPR.click/Odra spine and carries the **highest risk (x402)**. ~5 build-days; round ends **June 30, 2026**.

## De-risk x402 FIRST (the whole project hinges on it)
### Day 0 (spike, before committing) — x402 reachability
- Hit the **CSPR.cloud x402 facilitator** `/supported` on `casper:casper-test`; obtain an access token; confirm a CEP-18 "X402" token exists/deployable on Testnet.
- Run one **402 → EIP-712 pay → settle** round-trip end-to-end (JS against facilitator REST + casper-eip-712). **If this works, proceed. If not, stand up the Go `make-software/casper-x402` fallback or downgrade Verity to a signed-unpaid read and document it.**

### Day 1 — On-chain spine
- `cargo odra new verity`; reputation registry (`post_value`, `settle`, `get_reputation`, `get_value`). Deploy to Testnet.
- Reuse `@vouch/conclave-mcp-tools` for CSPR.click posting; prove **one real `post_value` deploy hash**. (Hard gate cleared.)

### Day 2 — x402 paid endpoint
- Resource server: `GET /value` returns **402**, accepts EIP-712 payment, verifies+settles via facilitator, returns **200** + value + reputation + settlement hash.
- `scripts/x402_roundtrip.ts`.

### Day 3 — Oracle loop + settlement
- Scraper + calibrated confidence model; autonomous posting loop.
- `settle` job applies ground truth → rescore; `scripts/verify_reputation.ts`.
- Deterministic `scripts/seed.ts` + `scripts/settle.ts` (the engineered miss timeline).

### Day 4 — Dashboard + the wow
- Credit-score dashboard (reputation gauge/curve, value-vs-truth, x402 pay panel, consumer LTV panel).
- Wire the t0→t1→t2 demo so the miss visibly drops the score and price.

### Day 5 — Proof + submit
- `scripts/bench.ts` (x402 round-trip + post latency p50/p95), `check_submission_readiness.ts`.
- Vercel deploy, README (test count, contract address, x402 honesty note), record ≤3-min demo, submit + CSPR.fans post.

## Must-have vs nice-to-have
| Must-have | Nice-to-have |
|---|---|
| Real `post_value` tx + real x402 settlement tx | Multi-asset feeds |
| Reputation rises/falls on settlement | Staking/slashing economics |
| 402 → pay → 200 working round-trip | Custom MCP server exposing the oracle |
| Engineered "miss" demo | Reputation-weighted price auction |

## Mandatory deliverables
- `scripts/x402_roundtrip.ts`, `scripts/verify_reputation.ts`, `scripts/bench.ts`, `scripts/check_submission_readiness.ts`, `DEMO.md`, `ARCHITECTURE.md`, landing page.

## Kill-switch checkpoints
- **Day 0:** no working x402 round-trip → switch to Go fallback or descope to unpaid reads (documented) before sinking more time.
- **Day 1:** no real posting tx → fix before building the loop.
