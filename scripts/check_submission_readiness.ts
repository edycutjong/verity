// Fails (exit 1) if the repo still carries submission placeholders — run before submitting.
// Intentionally fails today: README has <address>/<hash>/<N> until the contract is deployed.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const failures: string[] = [];

const readme = readFileSync(join(ROOT, "README.md"), "utf8");
for (const ph of ["<address", "<hash>", "<N>", "filled at deploy", "filled at ship"]) {
  if (readme.includes(ph)) failures.push(`README still contains placeholder: "${ph}"`);
}

for (const f of ["sources.json", "expected_decisions.json", "ground_truth.json", "expected_reputation.json"]) {
  if (!existsSync(join(ROOT, "data", "fixtures", f))) failures.push(`missing fixture: data/fixtures/${f}`);
}

if (existsSync(join(ROOT, ".env"))) {
  failures.push(".env present in repo root — confirm it is gitignored and never committed");
}

// Check that core source files exist.
const corePaths = [
  "src/core/types.ts",
  "src/core/sources.ts",
  "src/core/reasoning.ts",
  "src/core/reputation.ts",
  "src/core/x402.ts",
  "src/core/post.ts",
  "src/core/consumer.ts",
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "contract/src/verity.rs",
];

for (const p of corePaths) {
  if (!existsSync(join(ROOT, p))) failures.push(`missing core file: ${p}`);
}

// Check that scripts exist.
const scriptPaths = [
  "scripts/seed.ts",
  "scripts/settle.ts",
  "scripts/verify_reputation.ts",
  "scripts/x402_roundtrip.ts",
  "scripts/bench.ts",
];

for (const p of scriptPaths) {
  if (!existsSync(join(ROOT, p))) failures.push(`missing script: ${p}`);
}

if (failures.length) {
  console.error("✗ submission NOT ready:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("✓ submission readiness checks passed");
