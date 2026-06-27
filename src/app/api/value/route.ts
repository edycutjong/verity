import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { runOraclePipeline } from "@/lib/pipeline";
import { getQueryPrice } from "@/core/reputation";
import { create402Challenge, executeRoundTrip } from "@/core/x402";
import {
  x402LiveConfigured,
  buildPaymentRequirements,
  verifyAndSettle,
  type PaymentPayload,
} from "@/core/x402_facilitator";
import { config } from "@/lib/config";

// x402-gated oracle value read.
//   GET /api/value?asset=XAU              → 402 Payment Required (challenge)
//   GET /api/value?asset=XAU  + payment   → 200 { value, reputation, settlementHash }
//
// Demo (default): payment is simulated server-side (core/x402.ts).
// Live (VERITY_DEMO=false + facilitator env): the 402 carries real x402
// PaymentRequirements and the retry's X-Payment header (base64 PaymentPayload)
// is verified + settled through the CSPR.cloud x402 facilitator.

const PAYEE = config.x402PayeeAddress || "0xverity-oracle-payee-demo";
const ASSET_PKG = config.x402AssetPackage || "hash-cep18-usdc-demo";
const PAYER = "0xconsumer-demo";

function paymentAttached(request: NextRequest): boolean {
  return (
    !!request.headers.get("x-payment") ||
    request.nextUrl.searchParams.get("pay") === "1"
  );
}

export async function GET(request: NextRequest) {
  const asset = request.nextUrl.searchParams.get("asset") ?? "XAU";
  const snapshot = runOraclePipeline();
  const { latest } = snapshot;
  const price = getQueryPrice(latest.repScore);
  const live = x402LiveConfigured();
  const resource = `/api/value?asset=${asset}`;

  // ── No payment → 402 challenge ──────────────────────────────────────────
  if (!paymentAttached(request)) {
    if (live) {
      const requirements = buildPaymentRequirements(price, resource);
      return NextResponse.json(
        { x402Version: 1, accepts: [requirements], reputation: Number((latest.repScore * 100).toFixed(2)) },
        { status: 402, headers: { "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(requirements)).toString("base64") } },
      );
    }
    const challenge = create402Challenge(price, ASSET_PKG, PAYEE, config.x402ChainId);
    return NextResponse.json(
      {
        ...challenge,
        message: "Payment Required",
        asset,
        reputation: Number((latest.repScore * 100).toFixed(2)),
        hint: `Pay ${price} via EIP-712 to read the ${asset} oracle value. Price scales with reputation — retry with the X-Payment header (or ?pay=1).`,
      },
      { status: 402 },
    );
  }

  // ── Live: verify + settle the attached PaymentPayload via the facilitator ─
  if (live) {
    let payload: PaymentPayload;
    try {
      payload = JSON.parse(Buffer.from(request.headers.get("x-payment") ?? "", "base64").toString("utf8"));
    } catch {
      return NextResponse.json({ error: "Malformed X-Payment payload (expected base64 JSON)" }, { status: 400 });
    }
    const requirements = buildPaymentRequirements(price, resource);
    const settle = await verifyAndSettle(payload, requirements);
    if (!settle.success) {
      return NextResponse.json({ error: settle.errorReason ?? "payment rejected" }, { status: 402 });
    }
    return NextResponse.json({
      asset,
      value: latest.postedValue,
      reputation: Number((latest.repScore * 100).toFixed(2)),
      pricePaid: price,
      settlementHash: settle.txHash,
      network: settle.network ?? config.x402ChainId,
      explorerUrl: settle.txHash ? `https://testnet.cspr.live/transaction/${settle.txHash}` : undefined,
      mode: "live",
    });
  }

  // ── Demo: simulate verify + settle → 200 with the value ─────────────────
  const roundTrip = executeRoundTrip(price, ASSET_PKG, PAYEE, PAYER);
  if (!roundTrip.receipt.success) {
    return NextResponse.json({ error: "Payment verification failed", scheme: "exact" }, { status: 402 });
  }

  return NextResponse.json({
    asset,
    value: latest.postedValue,
    reputation: Number((latest.repScore * 100).toFixed(2)),
    pricePaid: price,
    confidence: latest.confidence,
    settlementHash: roundTrip.receipt.settlementHash,
    latencyMs: Number(roundTrip.latencyMs.toFixed(2)),
    network: config.x402ChainId,
    explorerUrl: `https://testnet.cspr.live/deploy/${roundTrip.receipt.settlementHash.replace(/^0x/, "")}`,
    mode: "demo",
    note: "Boolean value gated by x402 — settlement deploy hash is on-chain; reputation read live from the registry in production.",
  });
}
