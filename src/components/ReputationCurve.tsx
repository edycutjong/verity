// Reputation over time — green bars for accurate posts, red for the miss.

import type { TimelineEntry } from "@/lib/pipeline";

export function ReputationCurve({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Reputation over time
      </h2>
      <div className="mt-4 flex h-24 items-end gap-2">
        {timeline.map((entry) => {
          const height = Math.max(10, entry.repScore * 100);
          const barColor = entry.isMiss
            ? "bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
            : "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
          return (
            <div key={entry.step} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold tabular-nums text-slate-400">
                {(entry.repScore * 100).toFixed(0)}%
              </span>
              <div className="relative w-full h-12 flex items-end bg-slate-950/60 rounded border border-slate-800/60 p-0.5">
                <div
                  className={`w-full rounded-sm transition-all duration-700 ${barColor}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="font-mono text-[9px] font-medium tracking-wider text-slate-500 uppercase">
                {entry.step}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
