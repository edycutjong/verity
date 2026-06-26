Smart contracts rely on oracles to connect with real-world assets. But standard oracles face no real penalties for delivering bad data; their trust assumptions are static, and their reputation is hidden. How do we build an oracle whose reputation is bound on-chain, and rises and falls dynamically with its accuracy?

Introducing Verity: an autonomous reputation oracle network built on Casper. Verity's registry contract, written in Rust with Odra, stores the oracle agent's score and settlements on-chain. On the Verity Dashboard, we track the live timeline of posted values for gold, silver, and copper, alongside the oracle's EWMA reputation score.

Let's watch the oracle reason. When multiple RWA feeds report divergent values, the Verity agent analyzes the evidence, detects potential price manipulation, and decides whether to post a consolidated value or abstain. Let's inspect the Oracle reasoning log to trace its decision metrics.

Now, let's watch what happens when the oracle gets it wrong. Ground truth is posted to the contract, trigger-settles a past post. When the error exceeds our two-percent threshold, the EWMA algorithm recalculates. Instantly, the oracle's reputation score drops on-chain. The oracle literally bleeds reputation for inaccuracy.

This reputation isn't just for show—it dictates query pricing. A consumer dapp requests the latest price, triggering a Casper x402 challenge. The query fee dynamically scales with the oracle's reputation. The consumer signs and settles the payment via the CSPR.cloud facilitator, unlocking the price feed instantly.

Verity proves that blockchain data feeds must have skin in the game. By linking data monetization directly to on-chain performance tracking on Casper, we establish a new standard for trustless oracle feeds. Verity is live on Casper Testnet. Build on Verity and secure your data feeds today.
