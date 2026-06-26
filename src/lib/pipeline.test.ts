import { describe, it, expect, vi } from "vitest";
import { runOraclePipeline } from "./pipeline";
import * as reasoning from "@/core/reasoning";
import * as fixtures from "./fixtures";
import * as postModule from "@/core/post";

// The pipeline is the shared source of truth for the home page and the x402
// /api/value route — these guard the story both surfaces depend on.

describe("runOraclePipeline", () => {
  it("produces a fully populated, serializable timeline", () => {
    const { timeline, latest, asset, agentKey } = runOraclePipeline();

    expect(timeline.length).toBeGreaterThan(0);
    expect(asset).toBeTruthy();
    expect(agentKey).toBe("0xoracle-agent-demo");
    expect(latest).toBe(timeline[timeline.length - 1]);

    // every entry round-trips through JSON without loss (props cross the RSC boundary)
    expect(() => JSON.parse(JSON.stringify(timeline))).not.toThrow();
    for (const entry of timeline) {
      expect(entry.queryPrice).toMatch(/^\$\d/);
      expect(entry.repScore).toBeGreaterThanOrEqual(0);
      expect(entry.repScore).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic across runs (same scores, same ordering)", () => {
    const a = runOraclePipeline();
    const b = runOraclePipeline();
    expect(a.timeline.map((t) => t.repScore)).toEqual(b.timeline.map((t) => t.repScore));
    expect(a.timeline.map((t) => t.step)).toEqual(b.timeline.map((t) => t.step));
  });

  it("the engineered t2 miss drops the score below its predecessor", () => {
    const { timeline } = runOraclePipeline();
    const t2Index = timeline.findIndex((t) => t.step === "t2");
    expect(t2Index).toBeGreaterThan(0);

    const t2 = timeline[t2Index];
    const prev = timeline[t2Index - 1];
    expect(t2.isMiss).toBe(true);
    expect(t2.repScore).toBeLessThan(prev.repScore);
  });

  it("query price tracks reputation: it falls after the miss", () => {
    const { timeline } = runOraclePipeline();
    const t2Index = timeline.findIndex((t) => t.step === "t2");
    const priceBefore = parseFloat(timeline[t2Index - 1].queryPrice.replace("$", ""));
    const priceAfter = parseFloat(timeline[t2Index].queryPrice.replace("$", ""));
    expect(priceAfter).toBeLessThan(priceBefore);
  });

  it("handles abstain decisions in the pipeline", () => {
    const spy = vi.spyOn(reasoning, "reasonOverSources").mockReturnValue({
      action: "abstain",
      rationale: "Mock abstain rationale",
      flaggedSources: [],
      deterministicBaseline: 0,
    });

    try {
      const { timeline } = runOraclePipeline();
      const t0 = timeline.find((t) => t.step === "t0")!;
      expect(t0.action).toBe("abstain");
      expect(t0.postedValue).toBeNull();
      expect(t0.deployHash).toBeNull();
      expect(t0.relativeError).toBeNull();
      expect(t0.isMiss).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("handles missing expected reputation", () => {
    const spy = vi.spyOn(fixtures, "loadExpectedReputation").mockReturnValue([]);
    try {
      const { timeline } = runOraclePipeline();
      for (const entry of timeline) {
        expect(entry.expectedScore).toBeNull();
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("handles undefined postedValue during post action", () => {
    const spy = vi.spyOn(reasoning, "reasonOverSources").mockReturnValue({
      action: "post",
      postedValue: undefined as any,
      confidence: 0.9,
      rationale: "test rationale",
      flaggedSources: [],
      deterministicBaseline: 100,
    });
    const postSpy = vi.spyOn(postModule, "postValue").mockReturnValue({
      postId: "post-mock",
      asset: "XAU",
      value: null as any,
      confidence: 0.9,
      rationaleHash: "0xhash",
      rationale: "test rationale",
      agentKey: "0xagent",
      deployHash: "0xdeploy",
      postedAt: new Date().toISOString(),
    });

    try {
      const { timeline } = runOraclePipeline();
      const t0 = timeline.find((t) => t.step === "t0")!;
      expect(t0.action).toBe("post");
      expect(t0.postedValue).toBeNull();
    } finally {
      spy.mockRestore();
      postSpy.mockRestore();
    }
  });
});


