# Verity — Product Requirements Document

> Part of the **Vouch** suite (Conclave · Verity · Bastion). **Build order: third/last** — highest x402 dependency, so it follows the proven spine from Conclave + Bastion.

## Emotional Hook (first line)
*A DeFi lending desk gets mass-liquidated by a "trusted" oracle whose price was six hours stale — and no one could audit the feed or hold it accountable, because oracles don't bleed when they're wrong.*

## Problem Statement
RWA and DeFi protocols depend on off-chain data — asset prices, indices, proof-of-reserve — fed on-chain by oracles that are trust black-boxes. When an oracle is stale, manipulated, or simply wrong, protocols liquidate users or misprice collateral, and the oracle faces **zero consequences**. Trust is asserted, not measured. There's no price for accuracy and no penalty for being wrong.

## Solution Overview
**Verity** is an autonomous RWA oracle agent that **reasons** about conflicting evidence and whose **income is bonded to its accuracy, entirely on-chain**:
- It **ingests multiple independent sources** for a value, and an **LLM reasoning agent** reconciles them — weighing source reliability, flagging outliers, detecting likely **manipulation or staleness**, and **deciding whether to post at all** (it abstains when sources diverge or confidence is low rather than publishing a guess).
- It emits a value **with a calibrated confidence and a written, auditable rationale**, then **posts** on-chain via CSPR.click.
- It maintains an **on-chain reputation score** in an Odra registry that **rises and falls** as ground truth arrives and its past calls are scored.
- Consumers **pay per query** via Casper **x402** — price scales with reputation, so honest oracles earn and inaccurate ones lose business.

The agent isn't a price-printer: it's a reasoner that defends or withholds a number and is then held economically accountable for it. "Reputation as collateral" — when it's wrong, you watch the score drop, live.

## Target Users
- **Primary:** Casper DeFi/RWA lending protocols that need auditable, accountable price/risk feeds to set LTV and trigger liquidations.
- **Secondary:** Other agents (e.g., Conclave's Treasury Agent) that want a paid, reputation-weighted data source.

## The ONE core flow (narrow + deep)
> **Agent ingests multiple sources → reasons over them (reconcile, flag manipulation, decide post-or-abstain) → posts a value + confidence + rationale on-chain → consumers pay per query via x402 to read it → when ground truth lands, the Odra registry rescores the agent's reputation up or down — visibly, on-chain.**

## Core Features (MVP)
1. **Multi-source reasoning agent** — ingests N independent sources; an LLM reconciles them, weighs reliability, flags outliers, detects manipulation/staleness, and **abstains** when evidence conflicts (no guessing).
2. **Calibrated confidence + auditable rationale** — every post carries a confidence score and a natural-language justification (hashed on-chain) explaining *why* this value and *why* this confidence.
3. **Autonomous posting loop** — reason → decide (post / abstain) → sign via CSPR.click → write value + confidence + rationale-hash to the Odra registry.
4. **On-chain reputation registry** — score tied to the agent's key, updated by an accuracy-settlement step.
5. **x402-gated query endpoint** — consumers pay per read; price scales with reputation (EIP-712-authorized CEP-18 micropayment via the CSPR.cloud facilitator).
6. **Accuracy settlement** — when ground truth arrives, the registry auto-adjusts reputation (the "wrong → score drops" moment).
7. **Public "oracle credit score" dashboard** — value history, confidence, the agent's reasoning, reputation curve, paid-query feed.

## User Stories
- *As a lending protocol,* I pay 0.001 of a CEP-18 per query to read Verity's gold-index value and its current reputation, and I size LTV by that score — so a low-rep feed automatically gets less trust.
- *As a skeptic,* I watch Verity make a deliberately wrong call in the demo and see its on-chain reputation **drop in real time** — accountability I can verify.

## Success Metrics
- **≥1 real Testnet posting tx** + **≥1 real x402 settlement** (CEP-18 transfer via facilitator), both with explorer links (hard gate).
- Reputation moves correctly on a planted right/wrong set (settlement recall = 100% on fixtures).
- **Reasoning quality:** on a planted **manipulation/divergence** case, the agent correctly **abstains or down-weights** the bad source (100% on fixtures) instead of posting a wrong value.
- x402 round-trip (402 → pay → 200) demonstrated end-to-end; latency published.

## Out of Scope
- Real production data licensing — MVP uses a mock/public RWA feed with an engineered ground-truth set.
- Multi-asset oracle network / staking-slashing economics beyond the reputation score.
- Mainnet; native (non-facilitator) x402.

## Honest Limitations
- **x402 is the riskiest dependency:** it's launching mid-event, is Go-first, and settles in CEP-18 via the CSPR.cloud facilitator. We build the client/server against the facilitator's REST endpoints + EIP-712 signing (JS), and keep a **Go micro-service fallback** if the JS path stalls. If x402 is unavailable on Testnet at build time, the query endpoint degrades to a signed-but-unpaid read and we document it.
- Reputation is only as meaningful as the ground-truth source; we state the source and scoring formula openly rather than implying objective truth.
