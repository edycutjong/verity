import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  llmConfigured: vi.fn(),
  structuredCall: vi.fn(),
}));

vi.mock("@/lib/anthropic", () => ({
  llmConfigured: mocks.llmConfigured,
  structuredCall: mocks.structuredCall,
}));

import { analyzeSnapshot, _resetAnalysisCache } from "./llm";
import { runOraclePipeline } from "@/lib/pipeline";

describe("LLM oracle analyst", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetAnalysisCache();
  });

  it("returns null without an API key (deterministic fallback)", async () => {
    mocks.llmConfigured.mockReturnValue(false);
    const snapshot = runOraclePipeline();
    expect(await analyzeSnapshot(snapshot)).toBeNull();
    expect(mocks.structuredCall).not.toHaveBeenCalled();
  });

  it("returns null when the Claude call fails (graceful degradation)", async () => {
    mocks.llmConfigured.mockReturnValue(true);
    mocks.structuredCall.mockRejectedValue(new Error("api down"));
    const snapshot = runOraclePipeline();
    expect(await analyzeSnapshot(snapshot)).toBeNull();
  });

  it("returns the structured analysis and stamps the model", async () => {
    mocks.llmConfigured.mockReturnValue(true);
    mocks.structuredCall.mockResolvedValue({
      narrative: "The t2 miss (1950 vs 2040) drove the EWMA drop.",
      riskFlags: ["source_c: outlier at t1"],
      penaltyWarranted: true,
    });
    const snapshot = runOraclePipeline();
    const analysis = await analyzeSnapshot(snapshot);
    expect(analysis?.narrative).toContain("t2");
    expect(analysis?.penaltyWarranted).toBe(true);
    expect(analysis?.model).toBeTruthy();
  });

  it("caches per snapshot digest — one Claude call for identical timelines", async () => {
    mocks.llmConfigured.mockReturnValue(true);
    mocks.structuredCall.mockResolvedValue({
      narrative: "n",
      riskFlags: [],
      penaltyWarranted: true,
    });
    const snapshot = runOraclePipeline();
    await analyzeSnapshot(snapshot);
    await analyzeSnapshot(runOraclePipeline());
    expect(mocks.structuredCall).toHaveBeenCalledTimes(1);
  });

  it("never lets the LLM alter deterministic numbers (values come from the pipeline)", async () => {
    mocks.llmConfigured.mockReturnValue(true);
    mocks.structuredCall.mockResolvedValue({
      narrative: "attempting to claim value is 9999",
      riskFlags: [],
      penaltyWarranted: false,
    });
    const snapshot = runOraclePipeline();
    const before = JSON.stringify(snapshot.timeline);
    await analyzeSnapshot(snapshot);
    // The analyst returns commentary only; the snapshot itself is untouched.
    expect(JSON.stringify(snapshot.timeline)).toBe(before);
  });
});
