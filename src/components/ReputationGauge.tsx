// Hero gauge — the oracle's live credit score with a pulse keyed to its health.

import type { TimelineEntry } from "@/lib/pipeline";

interface Props {
  latest: TimelineEntry;
  asset: string;
}

export function ReputationGauge({ latest, asset }: Props) {
  const pct = latest.repScore * 100;
  const barWidth = Math.round(latest.repScore * 100);
  const healthy = latest.repScore > 0.7;
  const warning = latest.repScore > 0.5;
  const barColor = healthy ? "bg-green-400" : warning ? "bg-amber-400" : "bg-red-400";
  const pulse = healthy ? "rep-pulse-green" : "rep-pulse-red";

  return (
    <section className="mt-12">
      <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Oracle Credit Score · {asset} Gold Index
      </h2>
      <div className={`mt-4 rounded-xl p-6 glass-elevated bento-card ${pulse}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-3xl font-bold tracking-tight tabular-nums text-glow text-cyan-400">
              {pct.toFixed(1)}%
            </p>
            <p className="mt-1.5 text-xs uppercase tracking-wider text-slate-400 font-semibold">reputation score</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-slate-300">
              latest: <span className="font-semibold text-slate-100">{latest.postedValue ?? "—"}</span> @{" "}
              <span className="font-semibold text-slate-100">{((latest.confidence ?? 0) * 100).toFixed(0)}%</span>
            </p>
            <p className="mt-1.5 text-xs text-slate-400">query price: <span className="font-mono text-cyan-400">{latest.queryPrice}</span></p>
          </div>
        </div>
        <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/30">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </section>
  );
}
