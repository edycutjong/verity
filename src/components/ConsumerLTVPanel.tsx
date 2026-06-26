// Consumer panel — a mock lending protocol that sizes LTV by oracle reputation.
// Shows the downstream blast radius when the oracle's score drops.

import type { TimelineEntry } from "@/lib/pipeline";

export function ConsumerLTVPanel({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Consumer: Mock Lending Protocol
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {timeline.map((entry) => {
          const tone = entry.ltvTightened
            ? "border-red-500/30 bg-red-500/5"
            : "border-green-500/20 bg-green-500/5";
          return (
            <div key={entry.step} className={`rounded-lg border p-4 ${tone}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-300">{entry.step}</span>
                <span
                  className={`font-mono text-sm font-medium ${
                    entry.ltvTightened ? "text-red-400" : "text-green-400"
                  }`}
                >
                  LTV {(entry.ltvRatio * 100).toFixed(1)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Rep: {(entry.repScore * 100).toFixed(1)} →{" "}
                {entry.ltvTightened ? (
                  <span className="text-red-400">tightened (low reputation)</span>
                ) : (
                  <span className="text-green-400">healthy</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
