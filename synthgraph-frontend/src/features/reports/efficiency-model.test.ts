import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeEfficiency,
  defaultMetricKey,
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
  it("prefers a metric with a known direction over an alphabetically earlier one", () => {
    assert.equal(defaultMetricKey(["epochs", "episode_reward"]), "episode_reward");
  });
  it("falls back to the first key, then empty", () => {
    assert.equal(defaultMetricKey(["epochs"]), "epochs");
    assert.equal(defaultMetricKey([]), "");
  });
});

describe("analyzeEfficiency (higher is better)", () => {
  const runs = [
    run("fast-ok", 10, [{ score: 0.7 }]),
    run("slow-best", 60, [{ score: 0.9 }]),
    run("slow-bad", 60, [{ score: 0.5 }]),
    run("none", 5, [{ other: 1 }]),
  ];

  it("marks the frontier and says who dominates the rest", () => {
    const rows = analyzeEfficiency(runs, "score", "higher");
    const byId = Object.fromEntries(rows.map((r) => [r.runId, r]));
    assert.equal(byId["fast-ok"].pareto, true);
    assert.equal(byId["slow-best"].pareto, true);
    assert.equal(byId["slow-bad"].pareto, false);
    assert.equal(byId["slow-bad"].dominatedBy?.runId, "fast-ok");
  });

  it("lists the frontier first, runs without the metric last", () => {
    const rows = analyzeEfficiency(runs, "score", "higher");
    assert.deepEqual(rows.map((r) => r.runId), ["slow-best", "fast-ok", "slow-bad", "none"]);
  });

  it("computes per-hour only for positive values", () => {
    const rows = analyzeEfficiency(runs, "score", "higher");
    assert.equal(rows.find((r) => r.runId === "fast-ok")?.perHour, 0.7 / (600 / 3600));
  });
});

describe("analyzeEfficiency (lower is better)", () => {
  const runs = [run("a", 10, [{ loss: 0.5 }, { loss: 0.2 }]), run("b", 20, [{ loss: 0.3 }])];

  it("takes each run's best (lowest) evaluation", () => {
    const rows = analyzeEfficiency(runs, "loss", "lower");
    assert.equal(rows.find((r) => r.runId === "a")?.value, 0.2);
  });

  it("treats the faster, lower run as dominating", () => {
    const rows = analyzeEfficiency(runs, "loss", "lower");
    const b = rows.find((r) => r.runId === "b");
    assert.equal(b?.pareto, false);
    assert.equal(b?.dominatedBy?.runId, "a");
  });

  it("gives no per-hour rate", () => {
    const rows = analyzeEfficiency(runs, "loss", "lower");
    assert.ok(rows.every((r) => r.perHour === null));
  });
});

describe("analyzeEfficiency (edge cases)", () => {
  it("does not divide by a zero duration", () => {
    const rows = analyzeEfficiency([run("instant", 0, [{ score: 1 }])], "score", "higher");
    assert.equal(rows[0].perHour, null);
  });

  it("keeps ties on the frontier instead of eliminating both", () => {
    const rows = analyzeEfficiency(
      [run("x", 10, [{ score: 0.5 }]), run("y", 10, [{ score: 0.5 }])],
      "score",
      "higher",
    );
    assert.ok(rows.every((r) => r.pareto));
  });
});

describe("paretoPath", () => {
  it("returns the frontier fastest-first in hours", () => {
    const rows = analyzeEfficiency(
      [run("fast", 30, [{ score: 0.6 }]), run("slow", 120, [{ score: 0.9 }]), run("bad", 150, [{ score: 0.4 }])],
      "score",
      "higher",
    );
    assert.deepEqual(paretoPath(rows), [
      [0.5, 0.6],
      [2, 0.9],
    ]);
  });
});
