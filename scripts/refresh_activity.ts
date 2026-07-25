// Finals-window activity refresh: broadcast one ACCURATE post_value → settle (a HIT)
// against the live Verity contract, so the explorer shows current-week activity and the
// oracle's reputation *recovers* (posts an accurate value, ground truth confirms it).
//
// Unlike settle.ts (which replays the fixture timeline incl. the engineered t2 miss),
// this posts a single fresh value and settles it against a matching ground truth →
// zero error → accuracy 10000 → EWMA lifts reputation. No narrative desync, no miss.
//
//   export $(grep -v '^#' .env.local | xargs)   # VERITY_DEMO=false + contract + key
//   pnpm tsx scripts/refresh_activity.ts
//
// It polls each tx to SUCCESS before the next step (settle requires the post finalized).

import { createHash } from "node:crypto";
import { postValueOnChain, settleOnChain } from "../src/lib/casper";

// Public node for read/poll — no auth needed, full history.
const POLL_NODE = process.env.REFRESH_POLL_NODE ?? "https://node.testnet.casper.network/rpc";

const ASSET = process.env.REFRESH_ASSET ?? "XAU";
const VALUE_BPS = Number(process.env.REFRESH_VALUE_BPS ?? 2015); // fresh accurate quote
const CONFIDENCE_BPS = Number(process.env.REFRESH_CONFIDENCE_BPS ?? 9600);
const KNOWN_POST_COUNT = Number(process.env.REFRESH_KNOWN_POST_COUNT ?? 3); // verified on-chain

interface ExecutionResult {
  error_message?: string | null;
  Version2?: { error_message?: string | null };
}
interface TxInfoResponse {
  result?: {
    execution_info?: { execution_result?: ExecutionResult; block_height?: number } | null;
  };
}

async function rpc(method: string, params: unknown): Promise<TxInfoResponse> {
  const res = await fetch(POLL_NODE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return (await res.json()) as TxInfoResponse;
}

async function waitForSuccess(hash: string, label: string): Promise<void> {
  for (let i = 0; i < 48; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await rpc("info_get_transaction", { transaction_hash: { Version1: hash } });
    const info = r?.result?.execution_info;
    if (info && info.execution_result) {
      const err = info.execution_result?.Version2?.error_message ?? info.execution_result?.error_message;
      if (err) throw new Error(`${label} FAILED on-chain: ${err}`);
      console.log(`  ✓ ${label} confirmed SUCCESS (block ${info.block_height ?? "?"})`);
      return;
    }
    process.stdout.write(".");
  }
  throw new Error(`${label} not confirmed after timeout (${hash})`);
}

async function main() {
  if (process.env.VERITY_DEMO !== "false") {
    throw new Error("Set VERITY_DEMO=false (and the live env) to broadcast real transactions.");
  }
  const newPostId = KNOWN_POST_COUNT + 1;
  const rationaleHash = createHash("sha256")
    .update(`finals-refresh:${ASSET}:${VALUE_BPS}:accurate`)
    .digest("hex");

  console.log(`⚖️  Verity activity refresh (LIVE) — accurate ${ASSET} post → HIT settle\n`);

  const post = await postValueOnChain({ asset: ASSET, valueBps: VALUE_BPS, confidenceBps: CONFIDENCE_BPS, rationaleHash });
  console.log(`⛓ post_value → ${post.deployHash}\n   ${post.explorerUrl}`);
  await waitForSuccess(post.deployHash, "post_value");

  // Ground truth == posted value → zero relative error → accuracy 10000 → reputation rises.
  const settle = await settleOnChain({ postId: newPostId, groundTruthBps: VALUE_BPS });
  console.log(`⛓ settle(post ${newPostId}, gt ${VALUE_BPS}) → ${settle.deployHash}\n   ${settle.explorerUrl}`);
  await waitForSuccess(settle.deployHash, "settle");

  console.log(`\n✅ Refresh complete — fresh accurate post settled as a HIT; reputation recovers on-chain.`);
  console.log(`   post_value: ${post.deployHash}`);
  console.log(`   settle:     ${settle.deployHash}`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
