<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 📊 Verity — Agent Instructions

## Project
Autonomous RWA oracle agent that reasons over conflicting evidence, whose on-chain reputation rises and falls with its accuracy, and whose data you pay for per query via Casper x402. When the oracle is wrong, its score drops — visibly, on-chain. Part of the **Vouch** suite (Conclave · Bastion · Verity).

## Hackathon
**Casper Agentic Buildathon 2026** (DoraHacks) — Casper Innovation Track, Build direction #3 (AI-Powered Oracle Networks). $150K prize pool.

## Structure
- `src/core/` — Domain layer (types, sources, reasoning, reputation, x402, post, consumer)
- `src/lib/` — Server config + fixture loaders + `pipeline.ts` (shared deterministic oracle pipeline used by the page **and** `/api/value`)
- `src/components/` — React 19 section components (VerityHero, ReputationGauge, ReputationCurve, ValueTruthTable, ReasoningLog, ConsumerLTVPanel, WhyCasper) + **OracleTerminal** (client, interactive x402 pay-to-read)
- `src/app/` — Next.js 16 dashboard + API routes. `/api/value` is a real x402 round-trip: `402` challenge → `X-Payment` header → `200 { value, reputation, settlementHash }`
- `contract/` — Odra upgradable Rust contract (reputation registry: post_value + settle)
- `scripts/` — CLI tools (seed, settle, verify_reputation, x402_roundtrip, bench, check_submission_readiness)
- `data/fixtures/` — Deterministic demo data (3-source timeline with engineered miss)

## Tech Stack
| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS v4 |
| **Testing** | Vitest |
| **Contract** | Odra (Rust) on Casper Testnet |
| **Reputation** | EWMA-based on-chain scoring |
| **Micropayments** | x402 (CSPR.cloud facilitator) |
| **Signing** | CSPR.click AI Agent Skill |
| **Credentials** | casper-eip-712 (JS) |

## Key Rules
- **Frontend** = ESM (`import`), Next.js 16, React 19, Tailwind v4
- **Tests** = Vitest globals (`describe`/`it`/`expect`)
- **Colors** = Green (#22c55e) for trust/high score, Red (#ef4444) for drops/misses, Amber (#f59e0b) for warnings, Cyan (#06b6d4) for Casper tools
- **Typography** = Geist Sans (body), Geist Mono (data)
- **Aesthetic** = Credit-bureau / institutional, dark mode, reputation pulse animations
- **No PII** = Only hashes and scores on-chain, never raw source data

## Critical Patterns
- All values on-chain in **basis points** (0–10000 = 0%–100%)
- EWMA: `score_new = α * accuracy + (1 - α) * score_old` with α = 0.3
- Accuracy: `max(0, 1 - relativeError / MISS_THRESHOLD)` with threshold = 2%
- Query price = BASE_PRICE × reputation (higher rep = higher price)
- t2 is the engineered miss: all sources agree at ~1950 but truth is 2040

## Commits & Releases
- **Conventional Commits required** — all commit messages MUST follow the format: `type(scope): description`
- Types: `feat` (minor bump), `fix`/`perf`/`refactor` (patch bump), `chore`/`docs`/`ci`/`test`/`style` (no release)
- Breaking changes: append `!` after type or include `BREAKING CHANGE:` in body → triggers major bump
- Examples: `feat(oracle): add multi-source aggregation`, `fix(x402): correct payment verification`, `chore: update deps`
- **Automated semantic versioning** runs in CI Stage 6 (`scripts/release-bump.ts`) — reads commits since last tag, bumps `package.json` + `contract/Cargo.toml`, generates `CHANGELOG.md`, creates GitHub Release
- Never manually edit `version` in `package.json` or `Cargo.toml` — the pipeline owns it
