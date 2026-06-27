// The Casper-only surface this oracle is built on.

const TOOLS = [
  { tool: "x402 facilitator", usage: "Pay-per-query oracle monetization (CEP-18)" },
  { tool: "casper-eip-712", usage: "Gasless payment authorization per query" },
  { tool: "Odra reputation registry", usage: "On-chain credit score that rises/falls" },
  { tool: "casper-js-sdk (PEM key)", usage: "Agent autonomously signs + posts each value" },
  { tool: "CSPR.cloud APIs", usage: "History + reputation for the dashboard" },
];

export function WhyCasper() {
  return (
    <section className="mt-12">
      <h2 className="text-xs font-medium uppercase tracking-widest text-slate-500">
        Why only Casper
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((item) => (
          <div key={item.tool} className="rounded-xl p-4 glass-elevated bento-card">
            <p className="text-xs font-semibold text-cyan-400 text-glow">{item.tool}</p>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{item.usage}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
