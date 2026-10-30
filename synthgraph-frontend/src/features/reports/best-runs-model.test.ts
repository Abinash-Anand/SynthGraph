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
  it("picks the high end as best when the metric is declared maximize", () => {
    const { outcomes } = buildBestRunsModel([record("episode_reward", 0.1, 0.9)], {
      episode_reward: { direction: "maximize", mixed: false },
    });
    assert.equal(outcomes[0].direction, "maximize");
    assert.equal(outcomes[0].best?.value, 0.9);
    assert.equal(outcomes[0].worst?.value, 0.1);
  });

  it("picks the low end as best when the metric is declared minimize", () => {
    const { outcomes } = buildBestRunsModel([record("val_loss", 0.2, 1.4)], {
      val_loss: { direction: "minimize", mixed: false },
    });
    assert.equal(outcomes[0].direction, "minimize");
    assert.equal(outcomes[0].best?.value, 0.2);
    assert.equal(outcomes[0].best?.runId, "val_loss-min");
  });

  it("follows the declaration, not the name", () => {
    const { outcomes } = buildBestRunsModel([record("val_loss", 0.2, 1.4)], {
      val_loss: { direction: "maximize", mixed: false },
    });
    assert.equal(outcomes[0].best?.value, 1.4);
  });

  it("crowns nobody when nothing is declared, whatever the names say", () => {
    // These names used to be read as lower-is-better and higher-is-better.
    const { outcomes } = buildBestRunsModel(
      [record("eval/collision_rate", 0.02, 0.08), record("episode_reward", 1, 9), record("val_loss", 0.2, 1.4)],
      undefined,
    );
    for (const row of outcomes) {
      assert.equal(row.best, null, row.metricKey);
      assert.equal(row.worst, null, row.metricKey);
      assert.equal(row.direction, null, row.metricKey);
      assert.equal(row.mixed, false, row.metricKey);
    }
  });

  it("crowns nobody for a metric declared neutral", () => {
    const { outcomes } = buildBestRunsModel([record("eval/episode_reward_std", 1.5, 9)], {
      "eval/episode_reward_std": { direction: "neutral", mixed: false },
    });
    assert.equal(outcomes[0].best, null);
    assert.equal(outcomes[0].direction, "neutral");
  });

  it("crowns nobody, and says so, when the experiments disagree", () => {
    const { outcomes } = buildBestRunsModel([record("val_loss", 0.2, 1.4)], {
      val_loss: { direction: null, mixed: true },
    });
    assert.equal(outcomes[0].best, null);
    assert.equal(outcomes[0].direction, null);
    assert.equal(outcomes[0].mixed, true);
  });

  it("keeps both extremes available for a metric with no declared direction", () => {
    const { outcomes } = buildBestRunsModel([record("epochs", 20, 20)], {});
    assert.equal(outcomes[0].best, null);
    assert.equal(outcomes[0].flat, true);
    assert.equal(outcomes[0].high.value, 20);
    assert.equal(outcomes[0].low.value, 20);
  });

  it("moves time and system readings out of the outcome list", () => {
    const model = buildBestRunsModel(
      [record("elapsed_seconds", 100, 588), record("cpu_percent", 3, 40), record("mAP50", 0.9, 0.92)],
      { mAP50: { direction: "maximize", mixed: false } },
    );
    assert.deepEqual(model.outcomes.map((r) => r.metricKey), ["mAP50"]);
    assert.deepEqual(model.readings.map((r) => r.metricKey), ["cpu_percent", "elapsed_seconds"]);
  });

  it("lists outcomes with a declared direction before the rest", () => {
    const { outcomes } = buildBestRunsModel([record("epochs", 1, 2), record("mAP50", 0.9, 0.92)], {
      mAP50: { direction: "maximize", mixed: false },
    });
    assert.deepEqual(outcomes.map((r) => r.metricKey), ["mAP50", "epochs"]);
  });
});
