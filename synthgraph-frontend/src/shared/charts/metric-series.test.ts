import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateRuns,
  domainIndexOf,
  normalizeValues,
  parseCheckpointStep,
  preferredSeriesKeys,
  READABLE_SERIES_LIMIT,
  rangeOf,
  scalesDiverge,
  splitStepDomains,
  TRIMMED_SERIES_COUNT,
} from "./metric-series.ts";

describe("splitStepDomains", () => {
  it("separates per-update steps from a far-away checkpoint step", () => {
    const steps = [...Array.from({ length: 58 }, (_, i) => i), 20160];
    assert.deepEqual(splitStepDomains(steps), [
      { from: 0, to: 57 },
      { from: 20160, to: 20160 },
    ]);
  });

  it("keeps evenly spaced checkpoints together", () => {
    assert.deepEqual(splitStepDomains([0, 20160, 40320]), [{ from: 0, to: 40320 }]);
  });

  it("handles empty and tiny inputs", () => {
    assert.deepEqual(splitStepDomains([]), []);
    assert.deepEqual(splitStepDomains([5]), [{ from: 5, to: 5 }]);
    assert.deepEqual(splitStepDomains([1, 2]), [{ from: 1, to: 2 }]);
  });

  it("can find which domain a step belongs to", () => {
    const domains = splitStepDomains([...Array.from({ length: 20 }, (_, i) => i), 5000]);
    assert.equal(domainIndexOf(domains, 7), 0);
    assert.equal(domainIndexOf(domains, 5000), 1);
  });
});

describe("preferredSeriesKeys", () => {
  it("leads with outcomes instead of logging order", () => {
    const keys = ["cpu_count", "cpu_percent", "memory_percent", "episode_reward", "training/policy_loss", "eval/sps"];
    assert.deepEqual(preferredSeriesKeys(keys), ["episode_reward", "training/policy_loss", "cpu_count"]);
  });

  it("prefers the aggregate over its sub-terms", () => {
    const keys = ["episode_reward/feet_clearance", "episode_reward", "episode_reward/tracking"];
    assert.equal(preferredSeriesKeys(keys, 1)[0], "episode_reward");
  });
});

describe("normalizeValues", () => {
  it("maps onto 0..1 and keeps gaps", () => {
    assert.deepEqual(normalizeValues([10, null, 20, 30], rangeOf([10, 20, 30])), [0, null, 0.5, 1]);
  });
  it("puts a flat series in the middle instead of dividing by zero", () => {
    assert.deepEqual(normalizeValues([4, 4], rangeOf([4, 4])), [0.5, 0.5]);
  });
});

describe("scalesDiverge", () => {
  it("flags a loss plotted beside a 0-200 series", () => {
    assert.equal(scalesDiverge([{ min: 0, max: 1 }, { min: 0, max: 200 }]), true);
  });
  it("is quiet for comparable scales and for a single series", () => {
    assert.equal(scalesDiverge([{ min: 0, max: 10 }, { min: 0, max: 40 }]), false);
    assert.equal(scalesDiverge([{ min: 0, max: 10 }]), false);
  });
});

describe("aggregateRuns", () => {
  it("averages across runs and only where at least two reported", () => {
    const band = aggregateRuns([
      [[0, 1], [1, 3]],
      [[0, 3], [1, 5], [2, 9]],
    ]);
    assert.equal(band.length, 2);
    assert.deepEqual(band[0], { step: 0, mean: 2, low: 2 - Math.SQRT2, high: 2 + Math.SQRT2, n: 2 });
    assert.equal(band[1].mean, 4);
  });
  it("returns nothing for a single run", () => {
    assert.deepEqual(aggregateRuns([[[0, 1]]]), []);
  });
});

describe("parseCheckpointStep", () => {
  it("reads the step out of an evaluation name", () => {
    assert.equal(parseCheckpointStep("go1-eval-run3-step20160"), 20160);
    assert.equal(parseCheckpointStep("eval_step_500"), 500);
    assert.equal(parseCheckpointStep("final"), null);
    assert.equal(parseCheckpointStep(null), null);
  });
});

describe("series limits", () => {
  it("trimming keeps outcomes and drops machine telemetry first", () => {
    const keys = ["cpu_count", "cpu_percent", "memory_percent", "episode_reward", "training/policy_loss", "mAP50", "val_loss", "eval/sps"];
    const kept = preferredSeriesKeys(keys, TRIMMED_SERIES_COUNT);
    assert.equal(kept.length, TRIMMED_SERIES_COUNT);
    for (const key of ["episode_reward", "training/policy_loss", "mAP50", "val_loss"]) {
      assert.ok(kept.includes(key), key);
    }
  });
  it("has a limit that trimming actually brings the chart under", () => {
    assert.ok(TRIMMED_SERIES_COUNT < READABLE_SERIES_LIMIT);
  });
});
