# Verity — UI / Design

## Design language
A clean "credit bureau for oracles" look — light/neutral with a single trust-green→risk-red reputation gradient. The hero element is a **reputation curve** that moves when the oracle is right or wrong. Monospace for on-chain values and deploy hashes.

## Screens

### 1. Oracle Credit Score (hero / money screen)
```
┌────────────────────────────────────────────────────────┐
│  VERITY · XAU Gold Index Oracle        rep ███████░ 0.81│
│  latest: 1,950  conf 0.85   posted ⛓ deploy/0xabc…      │
├────────────────────────────────────────────────────────┤
│  reputation ▁▂▃▅▆▇▆▅▃  ← dips on the t1 miss            │
├───────────────────────────┬────────────────────────────┤
│ value vs ground-truth      │  PRICE PER QUERY           │
│  2,000 / 2,003  ✓          │  scales with reputation     │
│  1,950 / 2,040  ✗ (miss)   │  0.0009 CEP-18  ↓ from .0011│
└───────────────────────────┴────────────────────────────┘
```
- The reputation bar + curve animate on settlement (the t1 miss is the visual climax).
- Each posted value links to its real Testnet deploy hash.

### 2. Pay-to-Read (x402 demo panel)
- "Read this feed" → triggers the **402 → pay → 200** flow live.
- Shows the EIP-712 authorization, the facilitator verify/settle steps, and the **settlement deploy hash**.
- After payment: value + current reputation returned; a paid-query feed ticks.

### 3. Consumer view (the point)
- A mock lending protocol panel that pulls Verity's value + reputation and **sizes LTV by the score** — when reputation drops at t1, the panel automatically tightens LTV. Shows *why accountability matters*.

## Mobile
- Single column: reputation curve on top (pinned), then value/ground-truth, then the pay-to-read button. A 30-second vertical clip of "wrong call → score drops → price falls" for CSPR.fans.

## Component list
`ReputationGauge`, `ReputationCurve`, `ValueVsTruthTable`, `PostDeployLink`, `X402PayPanel` (402/verify/settle states), `SettlementHashLink`, `ConsumerLTVPanel`, `PaidQueryFeed`.

## Assets to generate (manual, post-spec)
Hero: a credit-score dial fused with a blockchain block; OG image tagline "An oracle that bleeds when it's wrong."
