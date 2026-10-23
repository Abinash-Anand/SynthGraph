import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBestRunsModel, type BestRunsRecordInput } from "./best-runs-model.ts";

function record(metricKey: string, minValue: number, maxValue: number): BestRunsRecordInput {
  return {
    metricKey,
    minValue,
    minTrainingRunId: `${metricKey}-min`,
    minTrainingRunName: `${metricKey} low run`,
    maxValue,
    maxTrainingRunId: `${metricKey}-max`,
    maxTrainingRunName: `${metricKey} high run`,
  };
}

describe("buildBestRunsModel", () => {
  it("picks the high end as best when higher is better", () => {
    const { outcomes } = buildBestRunsModel([record("episode_reward", 0.1, 0.9)]);
    assert.equal(outcomes[0].direction, "higher");
    assert.equal(outcomes[0].best?.value, 0.9);
    assert.equal(outcomes[0].worst?.value, 0.1);
  });

  it("picks the low end as best when lower is better", () => {
    const { outcomes } = buildBestRunsModel([record("val_loss", 0.2, 1.4)]);
    assert.equal(outcomes[0].direction, "lower");
    assert.equal(outcomes[0].best?.value, 0.2);
    assert.equal(outcomes[0].best?.runId, "val_loss-min");
  });

  it("does not crown a best run for metrics without a direction", () => {
    const { outcomes } = buildBestRunsModel([record("epochs", 20, 20)]);
    assert.equal(outcomes[0].best, null);
    assert.equal(outcomes[0].flat, true);
  });

  it("moves time and system readings out of the outcome list", () => {
    const model = buildBestRunsModel([
      record("elapsed_seconds", 100, 588),
      record("cpu_percent", 3, 40),
      record("mAP50", 0.9, 0.92),
    ]);
    assert.deepEqual(model.outcomes.map((r) => r.metricKey), ["mAP50"]);
    assert.deepEqual(model.readings.map((r) => r.metricKey), ["cpu_percent", "elapsed_seconds"]);
  });

  it("lists directional outcomes before undirected ones", () => {
    const { outcomes } = buildBestRunsModel([record("epochs", 1, 2), record("mAP50", 0.9, 0.92)]);
    assert.deepEqual(outcomes.map((r) => r.metricKey), ["mAP50", "epochs"]);
  });
});
