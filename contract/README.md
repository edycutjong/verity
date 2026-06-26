# Verity Smart Contract ⚖️

This directory contains the **Verity Reputation Registry** smart contract, built using the [Odra framework](https://github.com/odradev/cargo-odra) in Rust for the Casper Network.

The contract stores the oracle agent's reputation score, logs published asset values, and calculates score adjustments using an **Exponentially Weighted Moving Average (EWMA)** when values are settled against ground truth.

---

## 🏗️ State Storage

The contract maintains the following state variables:
*   `admin`: The authorized oracle agent address allowed to post values and trigger settlements.
*   `reputation_bps`: The current reputation score of the oracle (represented in basis points: `0–10000`, starting at `7500` or `75%`).
*   `post_count` / `settle_count`: Counters tracking total posted values and total settled valuations.
*   `post_values` / `post_confidence` / `post_assets` / `post_rationale`: Mappings linking unique post IDs to their posted value (in basis points), confidence level (in basis points), asset name, and the SHA-256 hash of their supporting reasoning/evidence.
*   `latest_values`: Mappings from asset name to the latest posted value.
*   `settlements`: Mappings from post ID to the settled ground truth value.

---

## ⛓️ Core Entrypoints

### Admin Actions
*   `init(admin: Address)`: Initializes the contract and sets the authority key.
*   `post_value(asset: String, value_bps: u32, confidence_bps: u32, rationale_hash: String) -> u32`: Publishes a new valuation prediction. Returns a unique `post_id`.
*   `settle(post_id: u32, ground_truth_bps: u32)`: Sets the actual ground truth for a post, computes the accuracy, and rescores the oracle's reputation.

### Read-Only Queries
*   `get_reputation() -> u32`: Returns the oracle's current reputation score (e.g. `7500` for `75.00%`).
*   `get_value(asset: String) -> u32`: Returns the latest valuation for a given asset.
*   `get_post_value(post_id: u32) -> u32`: Returns the value posted under the specific ID.
*   `get_post_confidence(post_id: u32) -> u32`: Returns the confidence of the post.
*   `get_post_rationale(post_id: u32) -> String`: Returns the SHA-256 rationale hash.
*   `post_count() -> u32`: Returns total posts.
*   `settle_count() -> u32`: Returns total settled posts.

---

## 🧮 Reputation & Settlement Formula

Reputation adjustments are processed dynamically on-chain using an **EWMA** formula:
$$\text{Score}_{\text{new}} = \alpha \times \text{Accuracy} + (1 - \alpha) \times \text{Score}_{\text{old}}$$

Where:
*   $\alpha$ (alpha) = `30%` (`3000` bps)
*   **Relative Error** = $\frac{|\text{Posted Value} - \text{Ground Truth}|}{\text{Ground Truth}}$
*   **Miss Threshold** = `2.00%` (`200` bps)
*   **Accuracy** = $\max\left(0, 1 - \frac{\text{Relative Error}}{\text{Miss Threshold}}\right)$

If the relative error exceeds `2.00%`, accuracy is counted as `0` for that settlement, causing a visual drop in the on-chain reputation score.

---

## 🛠️ Usage & Commands

We recommend installing `cargo-odra` globally first:
```bash
cargo install cargo-odra --locked
```

### Build Contract
Compile the Rust contract code:
```bash
cargo odra build
```

Compile into WebAssembly (`wasm/Verity.wasm`) targeting the Casper VM:
```bash
cargo odra build -b casper
```

### Test Contract
Run the Rust unit tests locally:
```bash
cargo odra test
```

Run tests against the simulated Casper VM target:
```bash
cargo odra test -b casper
```
