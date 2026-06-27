import { version } from "../../package.json";

// Page hero — brand chip, title, and the one-line thesis.

export function VerityHero() {
  return (
    <header className="animate-fadeIn">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          {/* Premium Pulsing Animated SVG Emblem */}
          <svg className="h-8 w-8 text-cyan-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.6" className="animate-spinSlow" />
            <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="1" opacity="0.3" className="animate-pulse" />
            <polygon points="50,25 72,50 50,75 28,50" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" opacity="0.8" />
            <circle cx="50" cy="50" r="6" fill="currentColor" className="animate-pulse" />
            <path d="M50 25V75M28 50H72" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] font-semibold text-cyan-400 text-glow">
            Vouch · Casper Agentic Buildathon 2026
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gradient mt-1 flex items-center gap-3">
            Verity
            <span className="inline-flex items-center rounded-md bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400 ring-1 ring-inset ring-cyan-500/20">
              v{version}
            </span>
          </h1>
        </div>
      </div>
      <p className="mt-6 text-xl sm:text-2xl font-light text-slate-200 max-w-3xl leading-snug">
        RWA oracles that bleed when they&apos;re wrong.
      </p>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">
        An autonomous oracle agent that <strong className="text-slate-300">reasons</strong> over
        conflicting evidence, whose <strong className="text-slate-300">on-chain reputation</strong>{" "}
        rises and falls with accuracy, and whose data you{" "}
        <strong className="text-slate-300">pay for per query</strong> via Casper x402. When the
        oracle is wrong, its score drops — visibly, on-chain.
      </p>
    </header>
  );
}
