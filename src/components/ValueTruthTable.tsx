// Posted value vs. ground truth — the receipts behind every score change.

import type { TimelineEntry } from "@/lib/pipeline";

export function ValueTruthTable({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Value vs Ground Truth
      </h2>
      <div className="mt-4 overflow-x-auto rounded-lg glass-elevated">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--verity-border)] text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5">Step</th>
              <th className="px-4 py-2.5">Posted</th>
              <th className="px-4 py-2.5">Truth</th>
              <th className="px-4 py-2.5">Error</th>
              <th className="px-4 py-2.5">Score</th>
              <th className="px-4 py-2.5">Price</th>
              <th className="px-4 py-2.5">Deploy</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((entry) => (
              <tr key={entry.step} className="border-b border-slate-800/60 last:border-0">
                <td className="px-4 py-2 font-mono text-slate-300">{entry.step}</td>
                <td className="px-4 py-2 font-mono tabular-nums">
                  {entry.postedValue !== null ? entry.postedValue.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 font-mono tabular-nums text-slate-400">
                  {entry.groundTruth.toLocaleString()}
                </td>
                <td className="px-4 py-2 font-mono">
                  {entry.relativeError !== null ? (
                    <span className={entry.isMiss ? "text-red-400" : "text-green-400"}>
                      {entry.isMiss ? "✗" : "✓"} {(entry.relativeError * 100).toFixed(2)}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 font-mono tabular-nums">
                  {(entry.repScore * 100).toFixed(1)}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-400">{entry.queryPrice}</td>
                <td className="max-w-[140px] truncate px-4 py-2 font-mono text-xs text-cyan-400">
                  {entry.deployHash ? `${entry.deployHash.slice(0, 18)}…` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
