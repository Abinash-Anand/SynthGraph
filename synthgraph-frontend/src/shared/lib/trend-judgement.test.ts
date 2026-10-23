import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { judgeTrend, judgeTrendFor, summarizeTrends } from "./trend-judgement.ts";

describe("judgeTrend", () => {
  it("is good when a higher-is-better metric rises or a lower-is-better one falls", () => {
    assert.equal(judgeTrend("increasing", "higher"), "good");
    assert.equal(judgeTrend("decreasing", "lower"), "good");
  });

  it("is bad when a higher-is-better metric falls or a lower-is-better one rises", () => {
    assert.equal(judgeTrend("decreasing", "higher"), "bad");
    assert.equal(judgeTrend("increasing", "lower"), "bad");
  });

  it("does not judge without a direction, or a flat or unknown trend", () => {
    assert.equal(judgeTrend("increasing", "neutral"), "neutral");
    assert.equal(judgeTrend("flat", "higher"), "neutral");
    assert.equal(judgeTrend("insufficient_data", "lower"), "neutral");
  });
});

describe("judgeTrendFor", () => {
  it("reads the direction from the metric name", () => {
    assert.equal(judgeTrendFor("eval/episode_reward", "increasing"), "good");
    assert.equal(judgeTrendFor("training/policy_loss", "increasing"), "bad");
    assert.equal(judgeTrendFor("cpu_percent", "increasing"), "neutral");
  });
});

describe("summarizeTrends", () => {
  it("counts directions and verdicts", () => {
    const summary = summarizeTrends([
      { metricKey: "episode_reward", trend: "increasing" },
      { metricKey: "val_loss", trend: "increasing" },
      { metricKey: "val_loss", trend: "decreasing" },
      { metricKey: "cpu_percent", trend: "flat" },
      { metricKey: "x", trend: "insufficient_data" },
    ]);
    assert.deepEqual(summary, { increasing: 2, decreasing: 1, flat: 1, unknown: 1, good: 2, bad: 1 });
  });
});
