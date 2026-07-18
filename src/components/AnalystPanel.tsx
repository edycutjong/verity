"use client";

// Claude Analyst panel — renders the REAL LLM review of the settled timeline.
// Fetches after mount so the page stays fast; while the call runs it shows a
// working state, and with no API key it discloses the deterministic fallback.

import { useEffect, useState } from "react";
import type { OracleAnalysis } from "@/core/llm";

type State =
  | { phase: "loading" }
  | { phase: "ready"; analysis: OracleAnalysis }
  | { phase: "fallback" };

export function AnalystPanel() {
  const [state, setState] = useState<State>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analysis")
      .then((r) => r.json())
      .then((d: { analysis: OracleAnalysis | null }) => {
        if (cancelled) return;
        setState(d.analysis ? { phase: "ready", analysis: d.analysis } : { phase: "fallback" });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "fallback" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-8">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Claude Analyst Review
        </h2>
        {state.phase === "ready" && (
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 font-mono text-[10px] text-green-400">
            live · {state.analysis.model}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-lg p-4 glass-elevated">
        {state.phase === "loading" && (
          <p className="animate-pulse text-xs text-slate-500">
            Claude is auditing the settled timeline…
          </p>
        )}

        {state.phase === "fallback" && (
          <p className="text-xs leading-relaxed text-slate-500">
            No <span className="font-mono">ANTHROPIC_API_KEY</span> configured on this deployment —
            the deterministic reasoning log above is the full story. With a key, a real Claude
            analyst independently audits this timeline (its numbers always come from the
            deterministic engine either way).
          </p>
        )}

        {state.phase === "ready" && (
          <>
            <p className="text-xs leading-relaxed text-slate-300">{state.analysis.narrative}</p>
            {state.analysis.riskFlags.length > 0 && (
              <ul className="mt-3 space-y-1">
                {state.analysis.riskFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-amber-400">
                    ⚠ {flag}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              Penalty warranted:{" "}
              <span className={state.analysis.penaltyWarranted ? "text-green-400" : "text-red-400"}>
                {state.analysis.penaltyWarranted ? "YES" : "NO"}
              </span>
              {" · "}Independent LLM review — values, scores and prices remain deterministic; the
              analyst can only narrate and flag.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
