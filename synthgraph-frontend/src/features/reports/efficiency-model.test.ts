import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeEfficiency,
  closeResultsSpread,
  defaultMetricKey,
  paddedAxisRange,
  type EfficiencyRunInput,
  paretoPath,
  rankableMetricKeys,
} from "./efficiency-model.ts";

function run(id: string, minutes: number, metrics: Record<string, number>[]): EfficiencyRunInput {
  return {
    trainingRunId: id,
    name: id,
    durationSeconds: minutes * 60,
    evaluations: metrics.map((m) => ({ metrics: m })),
  };
}

describe("rankableMetricKeys", () => {
  it("drops time and system readings and puts outcomes first", () => {
    const keys = rankableMetricKeys([
      run("a", 10, [{ elapsed_seconds: 560, episode_reward: 1, cpu_percent: 3, epochs: 20 }]),
    ]);
    assert.deepEqual(keys, ["episode_reward", "epochs"]);
  });

  it("ignores non-numeric and non-finite values", () => {
    const keys = rankableMetricKeys([run("a", 10, [{ mAP50: Number.NaN }, { loss: 0.3 }])]);
    assert.deepEqual(keys, ["loss"]);
  });
});

describe("defaultMetricKey", () => {
  it("prefers a metric with a declared direction over an earlier one", () => {
    assert.equal(
      defaultMetricKey(["epochs", "episode_reward"], { episode_reward: { direction: "maximize", mixed: false } }),
      "episode_reward",
    );
  });
  it("does not prefer a metric because of its name", () => {
    assert.equal(defaultMetricKey(["epochs", "episode_reward"], {}), "epochs");
    assert.equal(defaultMetricKey(["epochs", "episode_reward"], undefined), "epochs");
  });
  it("does not prefer a neutral or mixed metric", () => {
    assert.equal(
      defaultMetricKey(["a", "b", "c"], {
        a: { direction: "neutral", mixed: false },
        b: { direction: null, mixed: true },
        c: { direction: "minimize", mixed: false },
      }),
      "c",
    );
  });
  it("falls back to the first key, then empty", () => {
    assert.equal(defaultMetricKey(["epochs"], {}), "epochs");
    assert.equal(defaultMetricKey([], {}), "");
  });
});

describe("analyzeEfficiency (maximize)", () => {
  const runs = [
    run("fast-ok", 10, [{ score: 0.7 }]),
    run("slow-best", 60, [{ score: 0.9 }]),
    run("slow-bad", 60, [{ score: 0.5 }]),
    run("none", 5, [{ other: 1 }]),
  ];

  it("marks the frontier and says who dominates the rest", () => {
    const rows = analyzeEfficiency(runs, "score", "maximize");
    const byId = Object.fromEntries(rows.map((r) => [r.runId, r]));
    assert.equal(byId["fast-ok"].pareto, true);
    assert.equal(byId["slow-best"].pareto, true);
    assert.equal(byId["slow-bad"].pareto, false);
    assert.equal(byId["slow-bad"].dominatedBy?.runId, "fast-ok");
  });

  it("lists the frontier first, runs without the metric last", () => {
    const rows = analyzeEfficiency(runs, "score", "maximize");
    assert.deepEqual(rows.map((r) => r.runId), ["slow-best", "fast-ok", "slow-bad", "none"]);
  });

  it("computes per-hour only for positive values", () => {
    const rows = analyzeEfficiency(runs, "score", "maximize");
    assert.equal(rows.find((r) => r.runId === "fast-ok")?.perHour, 0.7 / (600 / 3600));
  });
});

describe("analyzeEfficiency (minimize)", () => {
  const runs = [run("a", 10, [{ loss: 0.5 }, { loss: 0.2 }]), run("b", 20, [{ loss: 0.3 }])];

  it("takes each run's best (lowest) evaluation", () => {
    const rows = analyzeEfficiency(runs, "loss", "minimize");
    assert.equal(rows.find((r) => r.runId === "a")?.value, 0.2);
  });

  it("treats the faster, lower run as dominating", () => {
    const rows = analyzeEfficiency(runs, "loss", "minimize");
    const b = rows.find((r) => r.runId === "b");
    assert.equal(b?.pareto, false);
    assert.equal(b?.dominatedBy?.runId, "a");
  });

  it("gives no per-hour rate", () => {
    const rows = analyzeEfficiency(runs, "loss", "minimize");
    assert.ok(rows.every((r) => r.perHour === null));
  });
});

describe("analyzeEfficiency (edge cases)", () => {
  it("does not divide by a zero duration", () => {
    const rows = analyzeEfficiency([run("instant", 0, [{ score: 1 }])], "score", "maximize");
    assert.equal(rows[0].perHour, null);
  });

  it("keeps ties on the frontier instead of eliminating both", () => {
    const rows = analyzeEfficiency(
      [run("x", 10, [{ score: 0.5 }]), run("y", 10, [{ score: 0.5 }])],
      "score",
      "maximize",
    );
    assert.ok(rows.every((r) => r.pareto));
  });
});

describe("paretoPath", () => {
  it("returns the frontier fastest-first in hours", () => {
    const rows = analyzeEfficiency(
      [run("fast", 30, [{ score: 0.6 }]), run("slow", 120, [{ score: 0.9 }]), run("bad", 150, [{ score: 0.4 }])],
      "score",
      "maximize",
    );
    assert.deepEqual(paretoPath(rows), [
      [0.5, 0.6],
      [2, 0.9],
    ]);
  });
});

describe("paddedAxisRange", () => {
  it("does not zoom a tiny gap into a cliff", () => {
    const range = paddedAxisRange([0.7107, 0.7122]);
    assert.ok(range);
    // The 0.0015 gap is a sliver of the axis, not the whole of it.
    assert.ok((0.7122 - 0.7107) / (range.max - range.min) < 0.1);
    assert.ok(range.min < 0.7107 && range.max > 0.7122);
  });

  it("pads a spread-out set by half its spread", () => {
    const range = paddedAxisRange([10, 20]);
    // spread 10 -> pad 5 (half the spread beats 5% of the typical value, 0.75)
    assert.deepEqual(range, { min: 5, max: 25 });
  });

  it("copes with one value, all zeros, and no values", () => {
    assert.ok(paddedAxisRange([0.5]));
    assert.deepEqual(paddedAxisRange([0, 0]), { min: -1, max: 1 });
    assert.equal(paddedAxisRange([]), null);
    assert.equal(paddedAxisRange([Number.NaN]), null);
  });
});

describe("closeResultsSpread", () => {
  it("flags results within two percent of each other", () => {
    const spread = closeResultsSpread([0.7107, 0.7122]);
    assert.ok(spread !== null && spread < 0.01);
  });
  it("is quiet when results are clearly apart or there is only one", () => {
    assert.equal(closeResultsSpread([0.5, 0.9]), null);
    assert.equal(closeResultsSpread([0.7]), null);
    assert.equal(closeResultsSpread([0, 0]), null);
  });
});
