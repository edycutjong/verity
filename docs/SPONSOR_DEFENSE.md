# Verity — "Why ONLY Casper" Defense Brief

> Every row maps to code in this repo. Where the x402 payment is mocked in the
> default demo we say so — Verity's edge is reputation-as-collateral settled on a
> real Casper contract.

| # | Casper capability | Used for | Code location | Without it you'd need |
|---|---|---|---|---|
| 1 | **Odra reputation registry** (`post_value` + `settle`, EWMA score in basis points) | An on-chain "credit score" that rises/falls with accuracy | `contract/src/verity.rs` | A centralized reputation DB nobody can audit |
| 2 | **casper-js-sdk** (`PrivateKey.fromPem` → `ContractCallBuilder.byPackageHash` → `putTransaction`) | The oracle agent autonomously signs & posts each value and settles accuracy on Testnet | `src/lib/casper.ts`, `src/core/post.ts` | A custom keypair + deploy/broadcast pipeline |
| 3 | **x402 facilitator on CSPR.cloud** (`exact` scheme, CEP-18; `/verify` → `/settle`) | Pay-per-query monetization of the oracle | `src/core/x402_facilitator.ts`, `src/app/api/value/route.ts` | Stripe + an off-chain billing DB + a custom settlement layer |
| 4 | **Anthropic SDK** (Claude Haiku 4.5, structured outputs) | The analyst that audits the oracle's settled timeline — narrative + risk flags, never touching the numbers | `src/lib/anthropic.ts` | A hand-rolled LLM tool/schema layer |

## The argument
Verity turns "trust me" oracles into **accountable economic actors**: an **Odra**
contract holds a reputation score the chain itself adjusts (EWMA) when the oracle is
wrong; **casper-js-sdk** is how the agent autonomously posts values and settles
accuracy on-chain; and **x402** lets the oracle *charge per query*, so accuracy has a
price. Reputation-as-collateral, settled on-chain, is the trust-minimization story —
backed by confirmed Testnet transactions (see the README on-chain table, including the
`settle` where reputation visibly drops on a miss).

**Take Casper out and you'd need:** a payments processor, an off-chain billing
database, a custom settlement contract, and a centralized reputation store — the exact
unauditable trust Verity exists to remove.

## Honest limitations (stated plainly)
- **The x402 payment is mocked in the default demo.** `src/core/x402.ts` `signPayment`
  is a SHA-256 stand-in and `settlePayment` returns a mock hash — there is no EIP-712
  and no facilitator call unless `VERITY_DEMO=false` + full x402 env, which routes
  through the real CSPR.cloud facilitator (`src/core/x402_facilitator.ts`). We do
  **not** use `casper-eip-712` or `CSPR.click`; on-chain signing is `casper-js-sdk`
  directly.
- x402 on Casper is new and Go-first; we build against the facilitator's REST
  `/verify` + `/settle` and keep it on the *check* path only, so posting/settlement
  never depend on it.
- Odra is Rust — we scope the contract to (post value, settle accuracy, read score)
  and keep modeling in the agent layer.
