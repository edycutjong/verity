// Deterministic demo: posts the engineered timeline and settles against ground truth.
// Uses committed Testnet-only keypairs (data/keys/) for reproducibility.

import { loadSources, loadGroundTruth } from "../src/lib/fixtures";
import { reasonOverSources, reasonWithOverride } from "../src/core/reasoning";
import { createReputationState, registerPost, settlePost, getReputation, getQueryPrice } from "../src/core/reputation";
import { postValue, resetPostCounter } from "../src/core/post";

async function main() {
  resetPostCounter();
  const sources = loadSources();
  const groundTruths = loadGroundTruth();
  const repState = createReputationState();
  const agentKey = "0xoracle-agent-demo";

  console.log("📊 Verity seed — posting oracle values + settling ground truth\n");

  for (let i = 0; i < sources.steps.length; i++) {
    const step = sources.steps[i];
    const gt = groundTruths[i];

    // t2 is the engineered miss.
    const decision = step.label === "t2"
      ? reasonWithOverride(step.readings, 1950, 0.85)
      : reasonOverSources(step.readings);

    console.log(`── ${step.label} ──`);

    if (decision.action === "abstain") {
      console.log(`   ABSTAIN: ${decision.rationale.slice(0, 80)}…`);
      continue;
    }

    const post = postValue(sources.asset, decision, agentKey);
    registerPost(repState, post);

    console.log(`   POST: ${post.value} @ ${(post.confidence * 100).toFixed(0)}%`);
    console.log(`   deploy: ${post.deployHash.slice(0, 24)}…`);

    if (decision.flaggedSources.length > 0) {
      console.log(`   ⚠ flagged: ${decision.flaggedSources.join(", ")}`);
    }

    // Settle.
    const settlement = settlePost(repState, post.postId, gt.trueValue, step.label);
    const icon = settlement.isMiss ? "✗" : "✓";
    console.log(`   ${icon} ground truth: ${gt.trueValue}, error: ${(settlement.relativeError * 100).toFixed(2)}%`);
    console.log(`   reputation: ${(settlement.scoreBefore * 100).toFixed(1)} → ${(settlement.scoreAfter * 100).toFixed(1)}`);
    console.log(`   settle deploy: ${settlement.deployHash.slice(0, 24)}…`);
    console.log();
  }

  const rep = getReputation(repState, agentKey);
  const price = getQueryPrice(rep.score);

  console.log("── Summary ──");
  console.log(`  Final reputation: ${(rep.score * 100).toFixed(1)}`);
  console.log(`  Query price: ${price}`);
  console.log(`  Posts: ${repState.settledPosts.length}`);

  // TODO(Day 1-2): Write to on-chain contract via CSPR.click:
  //   - Fund oracle account from faucet
  //   - Deploy the Verity Odra contract
  //   - Call post_value for each step
  //   - Call settle for each step
  //   - Persist deploy hashes to data/state.json
  console.log("\n⚠ On-chain wiring not yet connected — see BUILD_PLAN Day 1-2.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
