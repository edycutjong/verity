# Verity — Submission Copy

## Project title
**Verity — RWA oracles that bleed when they're wrong** (a Vouch project)

## Emotional Hook (first line)
A DeFi lending desk gets mass-liquidated by a "trusted" oracle whose price was six hours stale — and no one could audit the feed or hold it accountable, because oracles don't lose anything when they lie.

## Short description (≤150 chars)
An autonomous RWA oracle whose on-chain reputation rises and falls with its accuracy — and whose data you pay for per query via Casper x402.

## Long description (~500 words)
Every DeFi and RWA protocol runs on off-chain data piped on-chain by oracles you're forced to trust blindly. When an oracle is stale, manipulated, or simply wrong, users get liquidated and collateral gets mispriced — and the oracle faces no consequences at all. Trust is asserted, never measured. There is no price for accuracy and no penalty for being wrong.

**Verity** fixes the incentive. It's an autonomous RWA oracle agent that **reasons over conflicting evidence** and whose **income is bonded to its accuracy, entirely on-chain**. For each value the agent ingests **multiple independent sources** and an LLM reconciles them — weighing source reliability, flagging outliers, detecting likely **manipulation or staleness**, and **deciding whether to post at all** (it abstains rather than publish a guess). It emits a value with a calibrated confidence and a written rationale, then posts to an **Odra reputation registry** on Casper Testnet — signing each post via the **CSPR.click AI Agent Skill**. It maintains a public **reputation score** that the chain itself adjusts: when ground truth arrives and a past call was wrong, a settlement step **lowers the score** — visibly, on-chain.

Consumers — lending protocols, or other agents — **pay per query** to read Verity's value using Casper's **x402** micropayments: an HTTP `402` challenge, an **EIP-712**-signed CEP-18 authorization, settled by the **CSPR.cloud x402 facilitator**, and a `200` carrying the value plus the live reputation. Because price scales with reputation, **honest oracles earn more and inaccurate ones earn less** — accountability becomes an economic force, not a promise.

The demo makes the abstract visceral: Verity posts a strong call and its reputation ticks up; a consumer pays via x402 and reads the value (real settlement deploy hash on `cspr.live`); then Verity makes a deliberate **miss**, ground truth lands, and its reputation **drops in real time** while the per-query price falls and a mock lending panel automatically tightens its LTV. You watch an oracle get punished, on-chain, for being wrong — something no other oracle project can show.

Verity is part of **Vouch**, a trust layer for the agent economy on Casper. Its sibling **Conclave** brings accountability to governance; Verity brings it to data. Along the way it ships `@vouch/x402-casper-js` — a JS client/server for Casper's x402 facilitator that the ecosystem is currently missing (only a Go SDK exists).

## Why ONLY Casper (cites specific features)
Verity uses **5 Casper capabilities**: the **CSPR.cloud x402 facilitator** (`exact`/CEP-18 on `casper:casper-test`) for pay-per-query; **casper-eip-712** for gasless payment authorization; an **Odra** registry for on-chain reputation; **CSPR.click** (`casper-js-sdk` TransactionV1) for autonomous posting; and **CSPR.cloud** for history. **Take Casper out and you'd need a payments processor, an off-chain billing DB, a custom settlement contract, and a centralized reputation store** — reintroducing exactly the unauditable trust Verity removes. *Honest limitation:* x402 is brand-new (launching mid-event) and Go-first — we build against the facilitator's REST + EIP-712 and ship a Go fallback.

## Demo video script
See `DEMO.md` (≤3 min).

## Track / category
Casper Innovation Track — build direction **#2 RWA Oracle Agents with Verifiable On-Chain Identity**.

## On-chain proof
Odra reputation registry + real `post_value` and **x402 settlement** transactions on Casper Testnet; deploy hashes in README.

## Honest limitation
x402 on Testnet is the riskiest dependency and reputation is only as good as the stated ground-truth source; the LLM reasoning improves manipulation-resistance and abstention but can still err — so we publish the scoring formula, the agent's rationale, and the x402 fallback openly rather than implying objective truth or frictionless infra.

## Sign-off
Thank you for reviewing Verity. — Edy, building Vouch on Casper.
