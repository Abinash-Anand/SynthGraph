import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bestEvaluationValue,
  describeEvaluationSummary,
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
  it("prefers a directional metric", () => {
    assert.equal(preferredOutcomeKey(["epochs", "val_loss"]), "val_loss");
    assert.equal(preferredOutcomeKey([]), "");
  });
});

describe("bestEvaluationValue", () => {
  it("takes the best checkpoint in the metric's direction", () => {
    const r = run({ episode_reward: 1 }, { episode_reward: 4 }, { episode_reward: 2 });
    assert.equal(bestEvaluationValue(r, "episode_reward"), 4);
    const l = run({ val_loss: 0.9 }, { val_loss: 0.2 });
    assert.equal(bestEvaluationValue(l, "val_loss"), 0.2);
  });

  it("returns null when the metric was never recorded", () => {
    assert.equal(bestEvaluationValue(run({ other: 1 }), "episode_reward"), null);
    assert.equal(bestEvaluationValue(run(), "episode_reward"), null);
  });

  it("honours an explicit direction override", () => {
    assert.equal(bestEvaluationValue(run({ epochs: 3 }, { epochs: 9 }), "epochs", "lower"), 3);
  });
});

describe("summarizeEvaluations", () => {
  const fmt = (value: number) => String(value);

  it("calls the best checkpoint best when the direction is known", () => {
    const rewards = run({ episode_reward: 1 }, { episode_reward: 4 }, { episode_reward: 2 });
    assert.deepEqual(summarizeEvaluations(rewards, "episode_reward"), { kind: "best", value: 4 });
    const losses = run({ val_loss: 0.9 }, { val_loss: 0.2 });
    assert.deepEqual(summarizeEvaluations(losses, "val_loss"), { kind: "best", value: 0.2 });
  });

  it("never calls the maximum best when the direction is unknown", () => {
    // Regression: a lower-is-better metric without an inferable direction
    // (collision_rate was one before the keyword fix; "grip_force" still is)
    // printed its highest checkpoint as "best".
    const forces = run({ grip_force: 0.2 }, { grip_force: 0.9 }, { grip_force: 0.4 });
    const summary = summarizeEvaluations(forces, "grip_force");
    assert.deepEqual(summary, { kind: "range", highest: 0.9, lowest: 0.2 });
    assert.equal(describeEvaluationSummary(summary, fmt), "highest 0.9 · lowest 0.2");
    assert.equal(describeEvaluationSummary(summary, fmt).includes("best"), false);
  });

  it("shows a single value plainly and a missing one as a dash", () => {
    assert.equal(describeEvaluationSummary(summarizeEvaluations(run({ grip_force: 0.5 }), "grip_force"), fmt), "0.5");
    assert.equal(describeEvaluationSummary(summarizeEvaluations(run({ other: 1 }), "grip_force"), fmt), "—");
  });

  it("honours an explicit direction override", () => {
    assert.deepEqual(summarizeEvaluations(run({ epochs: 3 }, { epochs: 9 }), "epochs", "lower"), { kind: "best", value: 3 });
  });

  it("does not say best for a spread metric", () => {
    const spread = run({ "eval/episode_reward_std": 1.2 }, { "eval/episode_reward_std": 3.4 });
    const summary = summarizeEvaluations(spread, "eval/episode_reward_std");
    assert.equal(summary?.kind, "range");
  });
});
