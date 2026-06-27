// Apply ground truth to pending posts — the settlement step.
// In production: reads ground truth from an external feed and settles on-chain.

import { loadSources, loadGroundTruth } from "../src/lib/fixtures";
import { reasonOverSources, reasonWithOverride } from "../src/core/reasoning";
import { createReputationState, registerPost, settlePost, getReputation } from "../src/core/reputation";
import { postValue, resetPostCounter } from "../src/core/post";

async function main() {
  resetPostCounter();
  const sources = loadSources();
  const groundTruths = loadGroundTruth();
  const repState = createReputationState();
  const agentKey = "0xoracle-agent-demo";

  // Live mode broadcasts real post_value / settle TransactionV1s via casper-js-sdk.
  const LIVE = process.env.VERITY_DEMO === "false";
  const chain = LIVE ? await import("../src/lib/casper") : null;
  console.log(`⚖️  Verity settle — applying ground truth ${LIVE ? "(LIVE on-chain)" : "(demo)"}\n`);

  // First, re-create the posts.
  const posts = [];
  for (let i = 0; i < sources.steps.length; i++) {
    const step = sources.steps[i];
    const decision = step.label === "t2"
      ? reasonWithOverride(step.readings, 1950, 0.85)
      : reasonOverSources(step.readings);

    if (decision.action === "post") {
      const post = postValue(sources.asset, decision, agentKey);
      registerPost(repState, post);
      posts.push({ post, step: step.label });

      if (chain) {
        const { deployHash, explorerUrl } = await chain.postValueOnChain({
          asset: post.asset,
          valueBps: Math.round(post.value),
          confidenceBps: Math.round(post.confidence * 10000),
          rationaleHash: post.rationaleHash,
        });
        console.log(`  ⛓ post_value broadcast → ${deployHash}\n     ${explorerUrl}`);
      }
    }
  }

  // Now settle each post.
  for (let i = 0; i < posts.length; i++) {
    const { post, step } = posts[i];
    const gt = groundTruths[i];

    const result = settlePost(repState, post.postId, gt.trueValue, step);
    const icon = result.isMiss ? "✗ MISS" : "✓ OK";

    console.log(`${step}: posted ${result.postedValue} vs truth ${result.groundTruth} → ${icon}`);
    console.log(`  error: ${(result.relativeError * 100).toFixed(2)}% | score: ${(result.scoreBefore * 100).toFixed(1)} → ${(result.scoreAfter * 100).toFixed(1)}`);

    if (chain) {
      // On-chain post ids are assigned 1..N in submission order.
      const { deployHash, explorerUrl } = await chain.settleOnChain({
        postId: i + 1,
        groundTruthBps: Math.round(gt.trueValue),
      });
      console.log(`  ⛓ settle broadcast → ${deployHash}\n     ${explorerUrl}`);
    } else {
      console.log(`  deploy: ${result.deployHash.slice(0, 24)}…`);
    }
  }

  const rep = getReputation(repState, agentKey);
  console.log(`\nFinal reputation: ${(rep.score * 100).toFixed(1)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
