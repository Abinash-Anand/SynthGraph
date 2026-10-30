import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { judgementOf, summarizeTrends } from "./trend-judgement.ts";

describe("judgementOf", () => {
  it("reads the backend verdict and nothing else", () => {
    assert.equal(judgementOf("improving"), "good");
    assert.equal(judgementOf("worsening"), "bad");
    assert.equal(judgementOf("neutral"), "neutral");
  });

  it("is neutral when the backend sent no verdict", () => {
    // An older backend, or a metric with no declared direction: the frontend
    // must not fill the gap by guessing from the name.
    assert.equal(judgementOf(undefined), "neutral");
    assert.equal(judgementOf(null), "neutral");
  });
});

describe("summarizeTrends", () => {
  it("counts trend directions and the backend verdicts", () => {
    const summary = summarizeTrends([
      { trend: "increasing", verdict: "improving" },
      { trend: "increasing", verdict: "worsening" },
      { trend: "decreasing", verdict: "improving" },
      { trend: "flat", verdict: "neutral" },
      { trend: "insufficient_data" },
    ]);
    assert.deepEqual(summary, { increasing: 2, decreasing: 1, flat: 1, unknown: 1, good: 2, bad: 1 });
  });

  it("never counts a verdict the backend did not give", () => {
    const summary = summarizeTrends([{ trend: "increasing", verdict: "neutral" }, { trend: "decreasing" }]);
    assert.equal(summary.good, 0);
    assert.equal(summary.bad, 0);
  });
});
