# Verity — Live Testnet Wiring

Verity ships in **demo mode** (deterministic pipeline, no keys). This runbook flips
the real-chain paths to **Casper Testnet**:

| Path | Code | Activated by |
|---|---|---|
| **post_value / settle (real tx)** | `scripts/settle.ts` → `src/lib/casper.ts` (casper-js-sdk v5) | `VERITY_DEMO=false` + funded oracle key + `VERITY_CONTRACT_HASH` |
| **x402 pay-per-query** | `src/app/api/value` → `src/core/x402_facilitator.ts` | `VERITY_DEMO=false` + facilitator env |

> casper-js-sdk surface verified against `@5.0.12` .d.ts. Confirm on first run:
> the deployed registry's `post_value(asset:String, value:U64, confidence_bps:U64,
> rationale_hash:String)` and `settle(asset:String, true_value:U64)` arg names
> match `src/lib/casper.ts`; and the x402 `/verify` + `/settle` request body field
> names match the make-software/casper-x402 Go reference.

---

## 1. Prerequisites
1. **CSPR.cloud token** — <https://cspr.cloud/> (reads, node RPC, x402 facilitator auth).
2. **Funded Ed25519 oracle key** — `casper-client keygen data/keys/oracle`, fund via the
   [Testnet faucet](https://testnet.cspr.live/tools/faucet).
3. **Deployed reputation registry** — build + deploy via the Odra livenet backend
   (`contract/bin/deploy.rs`, constructor `init(admin: Address)` → deployer):
   ```bash
   pnpm contract:build            # = cargo odra build → contract/wasm/Verity.wasm
   cd contract
   export ODRA_CASPER_LIVENET_SECRET_KEY_PATH=./keys/secret_key.pem
   export ODRA_CASPER_LIVENET_NODE_ADDRESS=https://node.testnet.cspr.cloud
   export ODRA_CASPER_LIVENET_CHAIN_NAME=casper-test
   export ODRA_CASPER_LIVENET_EVENTS_URL=https://node.testnet.cspr.cloud/events
   pnpm contract:deploy           # = cargo run --bin verity_livenet --features livenet
   # → prints "contract address : ..." → set VERITY_CONTRACT_HASH (prefix stripped).
   ```
4. **CEP-18 token + payee** for x402 — deploy/obtain a CEP-18 token; note its **package** hash
   (`X402_ASSET_PACKAGE`, strip the `hash-` prefix) and the `X402_PAYEE_ADDRESS`.

## 2. Configure `.env.local`
```ini
VERITY_DEMO=false
CSPR_CLOUD_API_KEY=<token>
CASPER_NODE_RPC=https://node.testnet.cspr.cloud/rpc
CASPER_CHAIN_NAME=casper-test
CASPER_ORACLE_SECRET_KEY_PATH=./data/keys/oracle/secret_key.pem
CASPER_KEY_ALGO=ed25519
VERITY_CONTRACT_HASH=hash-<deployed>
# x402
X402_FACILITATOR_URL=https://x402-facilitator.cspr.cloud
X402_ASSET_PACKAGE=<cep18 package hash, no hash- prefix>
X402_PAYEE_ADDRESS=<payee>
X402_CAIP2_CHAIN_ID=casper:casper-test
```

## 3. Verify each path

### Real post_value + settle (the oracle's on-chain writes)
```bash
# scripts read process.env — export your .env.local first:
export $(grep -v '^#' .env.local | xargs)
pnpm settle
# → prints "⛓ post_value broadcast → <hash>" and "⛓ settle broadcast → <hash>"
#   each links to https://testnet.cspr.live/transaction/<hash>
```

### Real x402 (402 → facilitator verify/settle → 200)
```bash
pnpm build && pnpm start
curl -s "http://localhost:3000/api/value?asset=XAU"        # → 402 + PAYMENT-REQUIRED header
# A real x402 client signs the PaymentRequirements (EIP-712) and retries with a
# base64 PaymentPayload in X-Payment; the server calls the facilitator /verify + /settle
# and returns { value, settlementHash, explorerUrl, mode:"live" }.
```
> The built-in **Oracle Terminal** UI is the *demo* path (simulated signature); a real
> payload requires an x402 client wallet, which is the live counterpart.

## 4. Safety
`.env.local`, `data/keys/`, `*.pem` are git-ignored. Demo mode stays the default.
