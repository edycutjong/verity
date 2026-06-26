// Real Casper x402 facilitator client (CSPR.cloud).
// Server-only. Reached only when VERITY_DEMO === "false" and the facilitator
// env is configured; otherwise the deterministic simulation in x402.ts is used.
//
// Verified surface (docs.cspr.cloud/x402-facilitator-api/reference + verified-API doc):
//   Base: https://x402-facilitator.cspr.cloud
//   GET  /supported          → schemes/networks the facilitator accepts
//   POST /verify             → validate a PaymentPayload against PaymentRequirements
//   POST /settle             → settle on-chain, returns the settlement tx hash
//   All endpoints require `Authorization: $CSPR_CLOUD_API_KEY`.
//   Scheme "exact", settled in a CEP-18 token, authorized via EIP-712.
//
// The /verify + /settle bodies follow the x402 standard envelope
// { x402Version, paymentPayload, paymentRequirements }. Field names mirror the
// make-software/casper-x402 Go reference — confirm against it on first live run.

import { config } from "@/lib/config";

export interface PaymentRequirements {
  scheme: "exact";
  network: string; // CAIP-2, e.g. casper:casper-test
  /** Price as a money string, e.g. "$0.000582". */
  maxAmountRequired: string;
  resource: string;
  description: string;
  /** CEP-18 asset package hash (no `hash-` prefix). */
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
}

/** The signed payload a client attaches (x402 PaymentPayload, EIP-712 authorization). */
export interface PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: Record<string, unknown>; // signature + authorization fields
}

export interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
}

export interface SettleResult {
  success: boolean;
  /** On-chain settlement transaction hash. */
  txHash?: string;
  network?: string;
  errorReason?: string;
}

/** True when the live facilitator is fully configured. */
export function x402LiveConfigured(): boolean {
  return (
    process.env.VERITY_DEMO === "false" &&
    !!config.x402FacilitatorUrl &&
    !!config.csprCloudKey &&
    !!config.x402AssetPackage &&
    !!config.x402PayeeAddress
  );
}

export function buildPaymentRequirements(price: string, resource: string): PaymentRequirements {
  return {
    scheme: "exact",
    network: config.x402ChainId,
    maxAmountRequired: price,
    resource,
    description: `Verity oracle value read (${resource})`,
    asset: config.x402AssetPackage.replace(/^hash-/, ""),
    payTo: config.x402PayeeAddress,
    maxTimeoutSeconds: 60,
  };
}

async function facilitatorPost<T>(path: "/verify" | "/settle", body: unknown): Promise<T> {
  const res = await fetch(`${config.x402FacilitatorUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: config.csprCloudKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`x402 facilitator ${path} → ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function facilitatorVerify(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResult> {
  return facilitatorPost<VerifyResult>("/verify", {
    x402Version: paymentPayload.x402Version,
    paymentPayload,
    paymentRequirements,
  });
}

export async function facilitatorSettle(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResult> {
  return facilitatorPost<SettleResult>("/settle", {
    x402Version: paymentPayload.x402Version,
    paymentPayload,
    paymentRequirements,
  });
}

/** Full verify → settle. Returns the on-chain settlement hash on success. */
export async function verifyAndSettle(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResult> {
  const verify = await facilitatorVerify(paymentPayload, paymentRequirements);
  if (!verify.isValid) {
    return { success: false, errorReason: verify.invalidReason ?? "verification failed" };
  }
  return facilitatorSettle(paymentPayload, paymentRequirements);
}
