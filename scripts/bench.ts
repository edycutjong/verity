// Benchmark: oracle posting + settlement + x402 latency.

import { loadSources, loadGroundTruth } from "../src/lib/fixtures";
import { reasonOverSources, reasonWithOverride } from "../src/core/reasoning";
import { createReputationState, registerPost, settlePost, getReputation, getQueryPrice } from "../src/core/reputation";
import { postValue, resetPostCounter } from "../src/core/post";
import { executeRoundTrip } from "../src/core/x402";

async function main() {
  console.log("⏱  Verity — Benchmark\n");

  resetPostCounter();
  const sources = loadSources();
  const groundTruths = loadGroundTruth();
  const repState = createReputationState();
  const agentKey = "0xoracle-agent-demo";

  // Benchmark posting + settlement.
  const postStart = performance.now();
  const posts = [];

  for (let i = 0; i < sources.steps.length; i++) {
    const step = sources.steps[i];
    const decision = step.label === "t2"
      ? reasonWithOverride(step.readings, 1950, 0.85)
      : reasonOverSources(step.readings);

    if (decision.action === "post") {
      const post = postValue(sources.asset, decision, agentKey);
      registerPost(repState, post);
      posts.push({ post, gt: groundTruths[i], step: step.label });
    }
  }
  const postMs = performance.now() - postStart;

  const settleStart = performance.now();
  for (const { post, gt, step } of posts) {
    settlePost(repState, post.postId, gt.trueValue, step);
  }
  const settleMs = performance.now() - settleStart;

  console.log(`Posting (${posts.length} values): ${postMs.toFixed(2)}ms`);
  console.log(`Settlement (${posts.length} settlements): ${settleMs.toFixed(2)}ms`);

  // Benchmark x402 round-trip.
  const rep = getReputation(repState, agentKey);
  const price = getQueryPrice(rep.score);

  const x402Times: number[] = [];
  for (let i = 0; i < 10; i++) {
    const result = executeRoundTrip(price, "hash-cep18", "0xpayee", "0xconsumer");
    x402Times.push(result.latencyMs);
  }
  x402Times.sort((a, b) => a - b);

  const p50 = x402Times[Math.floor(x402Times.length * 0.5)];
  const p95 = x402Times[Math.floor(x402Times.length * 0.95)];

  console.log(`\nx402 round-trip (10 iterations):`);
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);

  console.log("\n── Summary ──");
  console.log(`  Post p50: ${postMs.toFixed(2)}ms`);
  console.log(`  Settle p50: ${settleMs.toFixed(2)}ms`);
  console.log(`  x402 p50: ${p50.toFixed(2)}ms`);
  console.log(`  x402 p95: ${p95.toFixed(2)}ms`);
  console.log(`  Total: ${(postMs + settleMs).toFixed(2)}ms`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
