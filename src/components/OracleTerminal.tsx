"use client";

import { useCallback, useState } from "react";

// Interactive x402 pay-to-read terminal.
// Drives the real /api/value round-trip: GET → 402 challenge → attach payment → 200.
// This is the live, clickable counterpart to the static x402 explainer.

interface Challenge {
  scheme: string;
  asset: string;
  price: string;
  network: string;
  payTo: string;
  reputation: number;
  hint: string;
}

interface Receipt {
  asset: string;
  value: number | null;
  reputation: number;
  pricePaid: string;
  confidence: number | null;
  settlementHash: string;
  latencyMs: number;
  explorerUrl: string;
}

type Phase = "idle" | "challenged" | "paying" | "paid" | "error";

const ASSET = "XAU";

export function OracleTerminal() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestValue = useCallback(async () => {
    setPhase("idle");
    setReceipt(null);
    setError(null);
    try {
      const res = await fetch(`/api/value?asset=${ASSET}`);
      const data = await res.json();
      if (res.status !== 402) throw new Error("Expected a 402 challenge");
      setChallenge(data as Challenge);
      setPhase("challenged");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, []);

  const payAndRead = useCallback(async () => {
    setPhase("paying");
    setError(null);
    try {
      // Retry the same request with the payment authorization attached.
      const res = await fetch(`/api/value?asset=${ASSET}`, {
        headers: { "X-Payment": "eip712-demo-authorization" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment rejected");
      setReceipt(data as Receipt);
      setPhase("paid");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setChallenge(null);
    setReceipt(null);
    setError(null);
  }, []);

  // One-click demo: run the whole 402 → authorize → 200 round-trip with a
  // human-readable pause between the challenge and the payment.
  const [autoRunning, setAutoRunning] = useState(false);
  const runFullFlow = useCallback(async () => {
    setAutoRunning(true);
    try {
      await requestValue();
      await new Promise((r) => setTimeout(r, 1100));
      await payAndRead();
    } finally {
      setAutoRunning(false);
    }
  }, [requestValue, payAndRead]);

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
          x402 Oracle Terminal — pay to read
        </h2>
        <span className="font-mono text-[10px] text-slate-600">live · /api/value</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--verity-border)] bg-[#06101f] font-mono text-xs">
        {/* terminal chrome */}
        <div className="flex items-center gap-1.5 border-b border-[var(--verity-border)] bg-[var(--verity-navy-light)] px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
          <span className="ml-2 text-[10px] text-slate-500">consumer@verity</span>
        </div>

        <div className="space-y-1.5 break-all p-4 leading-relaxed">
          {/* request */}
          <p className="text-slate-400">
            <span className="text-slate-600">$</span> curl -i https://verity/api/value?asset=
            {ASSET}
          </p>

          {/* 402 challenge */}
          {(phase === "challenged" || phase === "paying" || phase === "paid") && challenge && (
            <div className="animate-slideDown">
              <p className="text-amber-300">‹ HTTP/1.1 402 Payment Required</p>
              <p className="pl-3 text-slate-400">
                scheme: <span className="text-slate-300">{challenge.scheme}</span> · price:{" "}
                <span className="text-amber-300">{challenge.price}</span> · network:{" "}
                <span className="text-slate-300">{challenge.network}</span>
              </p>
              <p className="pl-3 text-slate-500">payTo: {challenge.payTo}</p>
              <p className="pl-3 text-slate-500">
                reputation at quote: {challenge.reputation.toFixed(1)}
              </p>
            </div>
          )}

          {/* paying */}
          {phase === "paying" && (
            <p className="text-cyan-300">
              <span className="animate-blink">▮</span> signing EIP-712 authorization &amp; settling
              CEP-18…
            </p>
          )}

          {/* 200 receipt */}
          {phase === "paid" && receipt && (
            <div className="animate-slideDown">
              <p className="text-slate-400">
                <span className="text-slate-600">$</span> curl -i -H &quot;X-Payment: …&quot;
                /api/value?asset={ASSET}
              </p>
              <p className="text-green-300">‹ HTTP/1.1 200 OK</p>
              <p className="pl-3 text-slate-300">
                {"{"} value:{" "}
                <span className="text-cyan-300">{receipt.value ?? "—"}</span>, reputation:{" "}
                <span className="text-green-300">{receipt.reputation.toFixed(1)}</span>, paid:{" "}
                <span className="text-amber-300">{receipt.pricePaid}</span> {"}"}
              </p>
              <p className="pl-3 text-slate-500">
                settlement:{" "}
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hash-glow text-cyan-400 hover:underline"
                >
                  {receipt.settlementHash.slice(0, 26)}…
                </a>
              </p>
              <p className="pl-3 text-slate-600">round-trip: {receipt.latencyMs} ms</p>
            </div>
          )}

          {/* error */}
          {phase === "error" && error && <p className="text-red-400">‹ error: {error}</p>}
        </div>
      </div>

      {/* controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        {phase === "idle" || phase === "error" ? (
          <>
            <button
              onClick={() => void runFullFlow()}
              disabled={autoRunning}
              className={`rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400/60 hover:bg-cyan-500/20 active:scale-[.97] disabled:opacity-50 ${phase === "idle" && !autoRunning ? "animate-pulseRing" : ""}`}
            >
              ▶ Run the paid round-trip
            </button>
            <button
              onClick={() => void requestValue()}
              disabled={autoRunning}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:border-slate-600 hover:text-slate-300 active:scale-[.97] disabled:opacity-50"
            >
              Step-by-step: GET /value
            </button>
          </>
        ) : null}

        {phase === "challenged" && !autoRunning && (
          <button
            onClick={() => void payAndRead()}
            className="animate-pulseRing rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition-all hover:border-amber-400/60 hover:bg-amber-500/20 active:scale-[.97]"
          >
            Authorize &amp; Pay (EIP-712)
          </button>
        )}

        {(phase === "paid" || phase === "challenged") && (
          <button
            onClick={reset}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:border-slate-600 hover:text-slate-300"
          >
            Reset
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Price scales with reputation: a higher score earns a higher price. Boolean settlement only —
        the consumer pays, reads the value, and learns nothing else about the agent.
      </p>
    </section>
  );
}
