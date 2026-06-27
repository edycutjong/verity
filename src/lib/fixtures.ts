// Server-only loaders for the deterministic demo fixtures (data/fixtures/).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SourceTimeline, ExpectedDecision, GroundTruth } from "@/core/types";

const FIX = join(process.cwd(), "data", "fixtures");

export interface ExpectedReputation {
  step: string;
  expectedScore: number;
}

export function loadSources(): SourceTimeline {
  return JSON.parse(readFileSync(join(FIX, "sources.json"), "utf8"));
}

export function loadExpectedDecisions(): ExpectedDecision[] {
  return JSON.parse(readFileSync(join(FIX, "expected_decisions.json"), "utf8"));
}

export function loadGroundTruth(): GroundTruth[] {
  return JSON.parse(readFileSync(join(FIX, "ground_truth.json"), "utf8"));
}

export function loadExpectedReputation(): ExpectedReputation[] {
  return JSON.parse(readFileSync(join(FIX, "expected_reputation.json"), "utf8"));
}
