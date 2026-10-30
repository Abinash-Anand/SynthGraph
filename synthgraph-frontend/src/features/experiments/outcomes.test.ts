import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bestEvaluationValue,
  describeEvaluationSummary,
  latestEvaluationValue,
  outcomeMetricKeys,
  preferredOutcomeKey,
  summarizeEvaluations,
} from "./outcomes.ts";

const run = (...metrics: Record<string, unknown>[]) => ({ evaluations: metrics.map((m) => ({ metrics: m })) });

describe("outcomeMetricKeys", () => {
  it("lists outcomes first and drops timing/system readings", () => {
    const keys = outcomeMetricKeys([run({ elapsed_seconds: 5, epochs: 3, episode_reward: 1, cpu_percent: 2 })]);
    assert.deepEqual(keys, ["episode_reward", "epochs"]);
  });
});

describe("preferredOutcomeKey", () => {
  it("prefers a metric with a declared maximize or minimize direction", () => {
    assert.equal(preferredOutcomeKey(["epochs", "val_loss"], { val_loss: "minimize" }), "val_loss");
    assert.equal(preferredOutcomeKey(["a_metric", "b_metric"], { b_metric: "maximize" }), "b_metric");
    assert.equal(preferredOutcomeKey([], {}), "");
  });

  it("does not prefer a metric because its name sounds directional", () => {
    // Nothing declared: val_loss is not preferred over epochs, the first key wins.
    assert.equal(preferredOutcomeKey(["epochs", "val_loss"], {}), "epochs");
    assert.equal(preferredOutcomeKey(["epochs", "val_loss"], undefined), "epochs");
  });

  it("does not prefer a metric declared neutral", () => {
    assert.equal(preferredOutcomeKey(["lr", "val_loss"], { lr: "neutral" }), "lr");
    assert.equal(preferredOutcomeKey(["lr", "val_loss"], { lr: "neutral", val_loss: "minimize" }), "val_loss");
  });
});

describe("bestEvaluationValue", () => {
  it("takes the best checkpoint in the declared direction", () => {
    const r = run({ episode_reward: 1 }, { episode_reward: 4 }, { episode_reward: 2 });
    assert.equal(bestEvaluationValue(r, "episode_reward", "maximize"), 4);
    const l = run({ val_loss: 0.9 }, { val_loss: 0.2 });
    assert.equal(bestEvaluationValue(l, "val_loss", "minimize"), 0.2);
  });

  it("follows the declaration even when the name suggests the opposite", () => {
    assert.equal(bestEvaluationValue(run({ loss: 0.9 }, { loss: 0.2 }), "loss", "maximize"), 0.9);
  });

  it("returns null when the metric was never recorded", () => {
    assert.equal(bestEvaluationValue(run({ other: 1 }), "episode_reward", "maximize"), null);
    assert.equal(bestEvaluationValue(run(), "episode_reward", null), null);
  });

  it("uses the latest evaluation, not the highest, when no direction is declared", () => {
    const r = {
      evaluations: [
        { metrics: { collision_rate: 0.9 }, createdAt: "2026-01-01T00:00:00Z" },
        { metrics: { collision_rate: 0.1 }, createdAt: "2026-01-03T00:00:00Z" },
        { metrics: { collision_rate: 0.4 }, createdAt: "2026-01-02T00:00:00Z" },
      ],
    };
    assert.equal(bestEvaluationValue(r, "collision_rate", null), 0.1);
    assert.equal(bestEvaluationValue(r, "collision_rate", "neutral"), 0.1);
  });
});

describe("latestEvaluationValue", () => {
  it("picks by timestamp and falls back to list order", () => {
    assert.equal(latestEvaluationValue(run({ x: 1 }, { x: 2 }, { x: 3 }), "x"), 3);
    const dated = {
      evaluations: [
        { metrics: { x: 1 }, createdAt: "2026-02-01T00:00:00Z" },
        { metrics: { x: 2 }, createdAt: "2026-01-01T00:00:00Z" },
      ],
    };
    assert.equal(latestEvaluationValue(dated, "x"), 1);
  });

  it("skips evaluations that did not record the metric or recorded a non-number", () => {
    assert.equal(latestEvaluationValue(run({ x: 1 }, { y: 2 }, { x: "n/a" }, { x: Number.NaN }), "x"), 1);
    assert.equal(latestEvaluationValue(run(), "x"), null);
  });
});

describe("summarizeEvaluations", () => {
  const fmt = (value: number) => String(value);

  it("calls the best checkpoint best when a direction is declared", () => {
    const rewards = run({ episode_reward: 1 }, { episode_reward: 4 }, { episode_reward: 2 });
    assert.deepEqual(summarizeEvaluations(rewards, "episode_reward", "maximize"), { kind: "best", value: 4 });
    const losses = run({ val_loss: 0.9 }, { val_loss: 0.2 });
    assert.deepEqual(summarizeEvaluations(losses, "val_loss", "minimize"), { kind: "best", value: 0.2 });
  });

  it("never calls the maximum best when no direction is declared", () => {
    // Regression: a lower-is-better metric without a known direction printed its
    // highest checkpoint as "best". No name, however it reads, changes that now.
    const forces = run({ grip_force: 0.2 }, { grip_force: 0.9 }, { grip_force: 0.4 });
    const summary = summarizeEvaluations(forces, "grip_force", null);
    assert.deepEqual(summary, { kind: "range", highest: 0.9, lowest: 0.2 });
    assert.equal(describeEvaluationSummary(summary, fmt), "highest 0.9 · lowest 0.2");
    assert.equal(describeEvaluationSummary(summary, fmt).includes("best"), false);
  });

  it("shows a range for a metric declared neutral", () => {
    const summary = summarizeEvaluations(run({ lr: 0.1 }, { lr: 0.01 }), "lr", "neutral");
    assert.equal(summary?.kind, "range");
  });

  it("shows a single value plainly and a missing one as a dash", () => {
    assert.equal(describeEvaluationSummary(summarizeEvaluations(run({ grip_force: 0.5 }), "grip_force", null), fmt), "0.5");
    assert.equal(describeEvaluationSummary(summarizeEvaluations(run({ other: 1 }), "grip_force", null), fmt), "—");
  });

  it("does not say best for a loss-like name with nothing declared", () => {
    const summary = summarizeEvaluations(run({ val_loss: 0.2 }, { val_loss: 0.9 }), "val_loss", null);
    assert.equal(summary?.kind, "range");
  });
});
