// Agent reasoning log — the written rationale behind each post-or-abstain call.

import type { TimelineEntry } from "@/lib/pipeline";

export function ReasoningLog({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Agent Reasoning Log
      </h2>
      <div className="mt-4 space-y-3">
        {timeline.map((entry) => (
          <div key={entry.step} className="rounded-lg p-4 glass-elevated">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-slate-300">{entry.step}</span>
              <span
                className={`text-xs font-medium ${
                  entry.action === "post" ? "text-green-400" : "text-amber-400"
                }`}
              >
                {entry.action.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{entry.rationale}</p>
            {entry.flaggedSources.length > 0 && (
              <p className="mt-1 text-xs text-amber-400">
                ⚠ Flagged: {entry.flaggedSources.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
