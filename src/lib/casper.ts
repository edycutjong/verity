// Real Casper Testnet chain layer (casper-js-sdk v5 / Condor).
// Server-only. Demo never imports this; reached only when VERITY_DEMO === "false"
// and the contract + oracle key are configured.
//
// API verified against casper-js-sdk@5.0.12 .d.ts:
//   PrivateKey.fromPem(pem, KeyAlgorithm) · new RpcClient(new HttpHandler(url, "fetch"))
//   HttpHandler.setCustomHeaders({ Authorization }) · ContractCallBuilder(...).build()
//   tx.sign(key) · client.putTransaction(tx) → res.transactionHash.toHex()

import { readFileSync } from "node:fs";
import {
  Args,
  CLValue,
  ContractCallBuilder,
  Deploy,
  ExecutableDeployItem,
  HttpHandler,
  KeyAlgorithm,
  PrivateKey,
  RpcClient,
} from "casper-js-sdk";
import { config } from "./config";

const DEFAULT_PAYMENT_MOTES = Number(process.env.CASPER_CALL_PAYMENT_MOTES ?? 5_000_000_000);

export function keyAlgorithm(): KeyAlgorithm {
  return (process.env.CASPER_KEY_ALGO ?? "ed25519").toLowerCase() === "secp256k1"
    ? KeyAlgorithm.SECP256K1
    : KeyAlgorithm.ED25519;
}

export function loadSignerKey(): PrivateKey {
  let pem: string;
  if (config.oracleKeyPath.includes("-----BEGIN")) {
    pem = config.oracleKeyPath.replace(/\\n/g, "\n");
  } else {
    pem = readFileSync(config.oracleKeyPath, "utf8");
  }
  return PrivateKey.fromPem(pem, keyAlgorithm());
}

export function signerPublicKeyHex(): string {
  return loadSignerKey().publicKey.toHex();
}

export function makeRpcClient(): RpcClient {
  const handler = new HttpHandler(config.nodeRpc, "fetch");
  if (config.csprCloudKey) handler.setCustomHeaders({ Authorization: config.csprCloudKey });
  return new RpcClient(handler);
}

function bareHash(hash: string): string {
  return hash.replace(/^(hash-|contract-|entity-contract-)/, "");
}

export function txExplorerUrl(hash: string): string {
  return `https://testnet.cspr.live/transaction/${hash}`;
}

export interface ContractCallResult {
  deployHash: string;
  explorerUrl: string;
}

async function callContract(entryPoint: string, args: Args, paymentMotes = DEFAULT_PAYMENT_MOTES): Promise<ContractCallResult> {
  if (!config.contractHash) {
    throw new Error("VERITY_CONTRACT_HASH not set — deploy the reputation registry first (see LIVE_TESTNET.md).");
  }
  const key = loadSignerKey();
  const tx = new ContractCallBuilder()
    .from(key.publicKey)
    .byHash(bareHash(config.contractHash))
    .entryPoint(entryPoint)
    .runtimeArgs(args)
    .chainName(config.chainName)
    .payment(paymentMotes)
    .build();
  tx.sign(key);
  const res = await makeRpcClient().putTransaction(tx);
  const deployHash = res.transactionHash.toHex();
  return { deployHash, explorerUrl: txExplorerUrl(deployHash) };
}

export { Args, CLValue, Deploy, ExecutableDeployItem };

// Arg names/types verified against contract/src/verity.rs:
//   post_value(asset: String, value_bps: u32, confidence_bps: u32, rationale_hash: String) -> u32
//   settle(post_id: u32, ground_truth_bps: u32)

/** Broadcast a real post_value(asset, value_bps, confidence_bps, rationale_hash). */
export async function postValueOnChain(input: {
  asset: string;
  valueBps: number;
  confidenceBps: number;
  rationaleHash: string;
}): Promise<ContractCallResult> {
  return callContract(
    "post_value",
    Args.fromMap({
      asset: CLValue.newCLString(input.asset),
      value_bps: CLValue.newCLUInt32(input.valueBps),
      confidence_bps: CLValue.newCLUInt32(input.confidenceBps),
      rationale_hash: CLValue.newCLString(input.rationaleHash),
    }),
  );
}

/** Broadcast a real settle(post_id, ground_truth_bps) updating the EWMA reputation. */
export async function settleOnChain(input: {
  postId: number;
  groundTruthBps: number;
}): Promise<ContractCallResult> {
  return callContract(
    "settle",
    Args.fromMap({
      post_id: CLValue.newCLUInt32(input.postId),
      ground_truth_bps: CLValue.newCLUInt32(input.groundTruthBps),
    }),
  );
}
