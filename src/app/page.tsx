import { runOraclePipeline } from "@/lib/pipeline";
import { VerityHero } from "@/components/VerityHero";
import { ReputationGauge } from "@/components/ReputationGauge";
import { OracleTerminal } from "@/components/OracleTerminal";
import { ReputationCurve } from "@/components/ReputationCurve";
import { ValueTruthTable } from "@/components/ValueTruthTable";
import { ReasoningLog } from "@/components/ReasoningLog";
import { AnalystPanel } from "@/components/AnalystPanel";
import { ConsumerLTVPanel } from "@/components/ConsumerLTVPanel";
import { WhyCasper } from "@/components/WhyCasper";
import { SuiteFooter } from "@/components/SuiteFooter";

export default async function Home() {
  const { timeline, latest, asset } = runOraclePipeline();

  return (
    <main className="min-h-screen grid-bg relative overflow-hidden">
      <div className="nebula-glow" />
      <div className="scanline" />
      <div className="mx-auto max-w-5xl px-6 py-12 relative z-10">
        <VerityHero />
        <ReputationGauge latest={latest} asset={asset} />
        <OracleTerminal />
        <ReputationCurve timeline={timeline} />
        <ValueTruthTable timeline={timeline} />
        <ReasoningLog timeline={timeline} />
        <AnalystPanel />
        <ConsumerLTVPanel timeline={timeline} />
        <WhyCasper />
        <SuiteFooter />
      </div>
    </main>
  );
}
