// Deploys an Odra-based CEP-18 token ("Cep18x402") on Casper Testnet for x402 micropayments.
// Uses the same SessionBuilder.installOrUpgrade() pattern as Verity/Conclave contracts.
//
// Run:  export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/deploy_cep18.ts

import { readFileSync } from "node:fs";
import { SessionBuilder } from "casper-js-sdk";
import {
  Args,
  CLValue,
  loadSignerKey,
  signerPublicKeyHex,
  makeRpcClient,
  txExplorerUrl,
} from "@/lib/casper";
import { config } from "@/lib/config";

const WASM_PATH = process.env.CEP18_WASM_PATH ?? "/tmp/cep18-odra/cep18_x402/wasm/MyToken.wasm";
const PACKAGE_KEY_NAME = "MyToken_package_hash"; // odra-core: format!("{}_package_hash", ident)
const TOKEN_NAME = "Cep18x402";
const TOKEN_SYMBOL = "X402";
const TOKEN_DECIMALS = 2;
const TOKEN_INITIAL_SUPPLY = "100000000"; // 1,000,000.00 tokens (2 decimals)
const PAYMENT_MOTES = Number(process.env.CEP18_INSTALL_MOTES ?? 500_000_000_000); // 500 CSPR

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rpc(method: string, params: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(config.nodeRpc, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: config.csprCloudKey },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: Record<string, unknown>; error?: unknown };
  if (json.error) throw new Error(`RPC ${method} → ${JSON.stringify(json.error)}`);
  return json.result ?? {};
}

async function main() {
  const key = loadSignerKey();
  const pubHex = signerPublicKeyHex();
  const wasm = new Uint8Array(readFileSync(WASM_PATH));
  console.log(`Deployer : ${pubHex}`);
  console.log(`Wasm     : ${WASM_PATH} (${wasm.length} bytes)`);
  console.log(`Token    : ${TOKEN_NAME} (${TOKEN_SYMBOL}), decimals=${TOKEN_DECIMALS}, supply=${TOKEN_INITIAL_SUPPLY}`);
  console.log(`Gas limit: ${PAYMENT_MOTES} motes (${PAYMENT_MOTES / 1e9} CSPR)\n`);

  // Odra init args — matches MyToken::init(name, symbol, decimals, initial_supply)
  // Plus Odra install ABI: odra_cfg_is_upgradable, odra_cfg_is_upgrade, etc.
  const args = Args.fromMap({
    // Odra install config
    odra_cfg_is_upgradable: CLValue.newCLValueBool(false),
    odra_cfg_is_upgrade: CLValue.newCLValueBool(false),
    odra_cfg_allow_key_override: CLValue.newCLValueBool(true),
    odra_cfg_package_hash_key_name: CLValue.newCLString(PACKAGE_KEY_NAME),
    // Contract init args
    name: CLValue.newCLString(TOKEN_NAME),
    symbol: CLValue.newCLString(TOKEN_SYMBOL),
    decimals: CLValue.newCLUint8(TOKEN_DECIMALS),
    initial_supply: CLValue.newCLUInt256(TOKEN_INITIAL_SUPPLY),
  });

  const tx = new SessionBuilder()
    .from(key.publicKey)
    .wasm(wasm)
    .installOrUpgrade()
    .runtimeArgs(args)
    .chainName(config.chainName)
    .payment(PAYMENT_MOTES)
    .build();
  tx.sign(key);

  const client = makeRpcClient();
  const res = await client.putTransaction(tx);
  const hash = res.transactionHash.toHex();
  console.log(`⛓  submitted CEP-18 install tx: ${hash}`);
  console.log(`   ${txExplorerUrl(hash)}\n   waiting for execution`);

  // Poll for execution
  let execResult: Record<string, unknown> | undefined;
  for (let i = 0; i < 72; i++) {
    await sleep(5000);
    try {
      const r = await rpc("info_get_transaction", { transaction_hash: { Version1: hash } });
      const info = r.execution_info as { execution_result?: Record<string, unknown> } | null;
      if (info && info.execution_result) {
        execResult = info.execution_result;
        break;
      }
    } catch {
      /* transient */
    }
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  if (!execResult) throw new Error("Timed out (~6 min).");

  const v2 = (execResult.Version2 ?? execResult) as {
    error_message?: string | null;
    consumed?: unknown;
  };
  if (v2.error_message) {
    throw new Error(`CEP-18 install FAILED: ${v2.error_message} (tx ${hash})`);
  }
  console.log(`\n✅ install executed on-chain. consumed=${v2.consumed ?? "?"}\n`);

  // Read deployer's named keys to find the package hash
  console.log("   reading package hash from deployer account...");
  try {
    const entityRes = await rpc("state_get_entity", {
      entity_identifier: { PublicKey: pubHex },
    });
    const entity = entityRes.entity as { named_keys?: Array<{ name: string; key: string }> } | null;
    const namedKeys = entity?.named_keys ?? [];
    const pkgKey = namedKeys.find((nk) => nk.name === PACKAGE_KEY_NAME);

    console.log("──────────────────────────────────────────────");
    console.log(`✅ CEP-18 "${TOKEN_NAME}" deployed to Casper Testnet`);
    console.log(`   install tx : ${txExplorerUrl(hash)}`);
    if (pkgKey) {
      const stripped = pkgKey.key.replace(/^hash-/, "");
      console.log(`   package    : ${pkgKey.key}`);
      console.log(`\n   → set in .env.local for BOTH Verity and Bastion:`);
      console.log(`     X402_ASSET_PACKAGE=${stripped}`);
    } else {
      console.log(`   ⚠️  '${PACKAGE_KEY_NAME}' not found. All named keys:`);
      namedKeys.forEach((nk) => console.log(`     ${nk.name} = ${nk.key}`));
    }
    console.log("──────────────────────────────────────────────");
  } catch (err) {
    console.log(`   ⚠️  Could not read named keys: ${err instanceof Error ? err.message : err}`);
    console.log(`   Inspect manually: ${txExplorerUrl(hash)}`);
  }
}

main().catch((e) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
