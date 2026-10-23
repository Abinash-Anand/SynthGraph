import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bestEvaluationValue, outcomeMetricKeys, preferredOutcomeKey } from "./outcomes.ts";

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
