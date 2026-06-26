# Verity — Seed Data Design

## The ONE devastating demo moment
> **Verity makes a deliberately wrong call, ground truth arrives, and its on-chain reputation visibly drops — then a consumer who paid via x402 sees the lower score and de-weights the feed.** Accountability you can watch.

## Engineered ground-truth set
A small, deterministic multi-source asset feed (e.g., a mock "XAU gold index" with 3 sources A/B/C) with a **scripted timeline** so the demo always tells the same story:
1. **t0 — strong call:** all 3 sources agree (~2,000); the agent reasons "high consensus," posts 2,000 @ confidence 0.9; ground truth = 2,003 → small error → reputation **ticks up**.
2. **t1 — manipulation caught (the reasoning beat):** source C is spiked to 2,600 (a manipulation/glitch) while A/B stay ~2,010. The agent's LLM **detects the outlier**, down-weights C (or **abstains** if divergence is extreme), and posts ~2,010 @ lowered confidence with a rationale naming C as suspect — instead of a corrupted average. *This is the AI doing real work.*
3. **t2 — the miss (the headline):** Verity posts 1,950 @ 0.85; ground truth = 2,040 → large error → settlement **drops reputation** a visible notch. The curve dips live. (Even a reasoning agent can be wrong — and it pays for it.)
4. **t3 — price reacts:** the x402 query price (scales with reputation) **falls** — a lower-rep oracle earns less. Self-correcting economics, on-screen.

## Fixtures (`scripts/seed.ts`, deterministic)
- `data/fixtures/sources.json` — the 3-source timeline incl. the t1 manipulation spike (source C).
- `data/fixtures/expected_decisions.json` — the agent's expected reason/decision per step (down-weight C / abstain), for the reasoning verify script.
- `data/fixtures/ground_truth.json` — the settlement values (right/wrong by design).
- `data/fixtures/expected_reputation.json` — the exact score after each settlement (for the verify script).
- A funded **Testnet oracle account** (committed keypair, Testnet only) + a **CEP-18 "X402" test token** balance for the consumer to pay with.
- A **consumer account** pre-funded with the CEP-18 token to execute the x402 payment in the demo.

## Reproducibility
- `scripts/seed.ts` posts the timeline deterministically; `scripts/settle.ts` applies ground truth in order.
- `scripts/verify_reputation.ts` — recomputes the score from the settlement formula and asserts it equals the on-chain `get_reputation` value (proves the score isn't faked).
- `scripts/x402_roundtrip.ts` — runs one full 402 → pay → 200 against the facilitator and prints the settlement deploy hash.

## What the data proves
A judge sees the one thing every other "oracle" project can't show: **the oracle being punished, on-chain, for being wrong**, and the market re-pricing its data accordingly. The engineered miss is the product demo.
