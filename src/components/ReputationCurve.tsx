// Reputation over time — green bars for accurate posts, red for the miss.

import type { TimelineEntry } from "@/lib/pipeline";

export function ReputationCurve({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Reputation over time
      </h2>
      <div className="mt-4 flex h-24 items-end gap-1">
        {timeline.map((entry) => {
          const height = Math.max(10, entry.repScore * 100);
          const barColor = entry.isMiss ? "bg-red-400" : "bg-green-400";
          return (
            <div key={entry.step} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[10px] tabular-nums text-slate-500">
                {(entry.repScore * 100).toFixed(0)}
              </span>
              <div
                className={`w-full rounded-t transition-all duration-500 ${barColor}`}
                style={{ height: `${height}%` }}
              />
              <span className="font-mono text-[10px] text-slate-500">{entry.step}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
