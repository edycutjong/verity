# Verity — Demo Script (≤ 3 min)

## Cold open (0:00–0:20)
VO over a liquidation-cascade chart: *"This desk was liquidated by an oracle whose price was six hours stale — and the oracle paid nothing. Verity makes oracles bleed when they're wrong."*

## Act 1 — The oracle reasons + posts (0:20–1:00)
- Show the agent loop: **3 sources in → LLM reconciles** ("high consensus ~2,000") → **CSPR.click posts** value 2,000 @ 0.9 + rationale to the Odra registry.
- **The reasoning beat:** source C spikes to 2,600. The agent's rationale flags C as a likely manipulation, **down-weights it**, and posts ~2,010 — *not* a corrupted average. VO: *"This is the agent doing real work — catching a bad feed instead of printing it."*
- Ground truth ~2,005 arrives → settlement ticks reputation **up**. Real Testnet deploy hash on screen.

## Act 2 — Pay-to-read via x402 (0:50–1:40) — sponsor wow
- Consumer clicks **Read this feed** → **402 Payment Required**.
- Consumer signs an **EIP-712** authorization → CSPR.cloud **facilitator** verifies + settles a CEP-18 micropayment → **200** with value + reputation.
- Show the **settlement deploy hash** on `testnet.cspr.live`. VO: *"Pay-per-query, machine-to-machine, settled on Casper."*

## Act 3 — The miss (1:40–2:30) — the headline
- Next post: 1,950 @ 0.85. Ground truth = 2,040 → **big miss**.
- Settlement fires → reputation **drops** a visible notch (curve dips live).
- The **query price falls** automatically, and the mock lending panel **tightens LTV** in response. VO: *"Wrong once, and the market re-prices its trust — automatically, on-chain."*

## Act 4 — Verify + close (2:30–3:00)
- Run `verify_reputation` → recomputed score == on-chain score. *"The score isn't ours to fake — it's the chain's."*
- Close: *"Verity — accountable RWA oracles, part of Vouch on Casper. Thank you for reviewing."*

## Expected outputs
| Step | Expected |
|---|---|
| t0 post | value 2,000, rep ticks up, real deploy hash |
| x402 read | 402 → EIP-712 pay → 200; settlement deploy hash |
| t1 miss settlement | reputation drops to expected_reputation[t1] |
| price | per-query price falls after t1 |
| verify_reputation | recomputed == on-chain |
