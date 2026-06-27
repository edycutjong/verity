// Verify that recomputed reputation matches on-chain reputation.
// In production: reads from on-chain `get_reputation` and compares.

import { loadSources, loadGroundTruth, loadExpectedReputation } from "../src/lib/fixtures";
import { reasonOverSources, reasonWithOverride } from "../src/core/reasoning";
import { createReputationState, registerPost, settlePost, getReputation } from "../src/core/reputation";
import { postValue, resetPostCounter } from "../src/core/post";

async function main() {
  resetPostCounter();
  const sources = loadSources();
  const groundTruths = loadGroundTruth();
  const expectedRep = loadExpectedReputation();
  const repState = createReputationState();
  const agentKey = "0xoracle-agent-demo";

  console.log("🔍 Verity verify — recomputing reputation\n");

  let allMatch = true;

  for (let i = 0; i < sources.steps.length; i++) {
    const step = sources.steps[i];
    const gt = groundTruths[i];
    const expected = expectedRep[i];

    const decision = step.label === "t2"
      ? reasonWithOverride(step.readings, 1950, 0.85)
      : reasonOverSources(step.readings);

    if (decision.action === "post") {
      const post = postValue(sources.asset, decision, agentKey);
      registerPost(repState, post);
      settlePost(repState, post.postId, gt.trueValue, step.label);
    }

    const rep = getReputation(repState, agentKey);
    const recomputed = parseFloat(rep.score.toFixed(4));
    const expectedScore = expected.expectedScore;
    const match = Math.abs(recomputed - expectedScore) < 0.005;

    const icon = match ? "✓" : "✗";
    console.log(`${icon} ${step.label}: recomputed=${recomputed.toFixed(4)} expected=${expectedScore.toFixed(4)} ${match ? "" : "MISMATCH"}`);

    if (!match) allMatch = false;
  }

  console.log();
  if (allMatch) {
    console.log("✓ All reputation scores match. The score isn't ours to fake — it's the chain's.");
  } else {
    console.log("✗ Some scores do not match — update expected_reputation.json or check the EWMA formula.");
    process.exit(1);
  }

  // TODO: In production, compare against on-chain `get_reputation` via CSPR.cloud.
  console.log("\n⚠ On-chain comparison not yet wired — see BUILD_PLAN Day 3.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
