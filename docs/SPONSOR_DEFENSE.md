# Verity — "Why ONLY Casper" Defense Brief

> Verified against the local `crawl/` source (x402 facilitator reference, casper-eip-712 digest, MCP repo, CSPR.click skill).

| # | Casper capability | Used for | Code location | Without it you'd need |
|---|---|---|---|---|
| 1 | **x402 facilitator on CSPR.cloud** (`exact` scheme, CEP-18, Testnet `casper:casper-test`; verify/settle endpoints) | Pay-per-query monetization of the oracle | `server/x402-gate.ts` | Stripe + an off-chain billing DB + a custom on-chain settlement layer |
| 2 | **casper-eip-712** (typed-data `signTypedData`, JS) | Authorize the CEP-18 micropayment per query (and pay facilitator fee in one signature) | `client/pay.ts` | A bespoke signature scheme + on-chain verifier |
| 3 | **Odra framework** (reputation registry + accuracy settlement) | On-chain "credit score" that rises/falls with accuracy | `contract/src/verity.rs` | A centralized reputation DB nobody can audit |
| 4 | **CSPR.click AI Agent Skill** (`casper-js-sdk` `TransactionV1`) | The agent autonomously signs + posts each verified value | `core/post.ts` | A custom keypair + deploy/broadcast pipeline |
| 5 | **CSPR.cloud APIs** (REST/streaming) | Read posted values + reputation history at scale for the dashboard | `web/data.ts` | A self-hosted archival node + indexer |

## The argument
Verity turns "trust me" oracles into **accountable economic actors** — and that's only possible on Casper because Casper ships the three pieces this needs together: **x402** lets the oracle *charge per query* (so accuracy has a price), **casper-eip-712** is the gasless authorization that makes per-query micropayments practical, and **Odra** holds a reputation score that the chain itself adjusts when the oracle is wrong. The agent signs and posts via **CSPR.click**. Reputation-as-collateral, settled on-chain, is the novel trust-minimization story Casper's Manifest is explicitly about.

**Take Casper out and you'd need:** a payments processor, an off-chain billing database, a custom settlement contract, and a centralized reputation store — four systems that reintroduce exactly the unauditable trust Verity exists to remove.

## Honest limitations of the Casper tooling
- **x402 is brand-new (launching June 2026) and Go-first**, settling in CEP-18 via the CSPR.cloud facilitator; there's no JS SDK, so we build against the facilitator's REST endpoints + EIP-712 signing and keep a Go fallback. This is our single biggest risk and we flag it openly.
- The facilitator requires a CSPR.cloud access token and a CEP-18 "X402"-style token on Testnet — an external dependency we pin and document.
- Odra is Rust — we scope the contract to (post value, settle accuracy, read score) and keep modeling in the agent layer.
