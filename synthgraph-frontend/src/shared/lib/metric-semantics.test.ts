import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareMetricKeys,
  isOutcomeMetric,
  metricDirection,
  metricKind,
} from "./metric-semantics.ts";

describe("metricKind", () => {
  it("treats time-like keys as time, not outcomes", () => {
    for (const key of ["elapsed_seconds", "eval/walltime", "training/walltime", "eval/epoch_eval_time"]) {
      assert.equal(metricKind(key), "time", key);
    }
  });

  it("recognises system and throughput readings", () => {
    assert.equal(metricKind("cpu_percent"), "system");
    assert.equal(metricKind("memory_total_mb"), "system");
    assert.equal(metricKind("training/sps"), "throughput");
  });

  it("recognises outcomes by word, not by substring", () => {
    assert.equal(metricKind("eval/episode_reward/feet_clearance"), "outcome");
    assert.equal(metricKind("training/policy_loss"), "outcome");
    assert.equal(metricKind("mAP50-95"), "outcome");
    assert.equal(metricKind("glossary_size"), "other");
  });
});

describe("metricDirection", () => {
  it("infers the direction for common outcome metrics", () => {
    assert.equal(metricDirection("episode_reward"), "higher");
    assert.equal(metricDirection("mAP50"), "higher");
    assert.equal(metricDirection("training/total_loss"), "lower");
    assert.equal(metricDirection("val_error"), "lower");
  });

  it("refuses to guess for time, system and unknown keys", () => {
    assert.equal(metricDirection("elapsed_seconds"), "neutral");
    assert.equal(metricDirection("cpu_percent"), "neutral");
    assert.equal(metricDirection("epochs"), "neutral");
  });

  it("is neutral when a key reads both ways", () => {
    assert.equal(metricDirection("reward_loss"), "neutral");
  });
});

describe("compareMetricKeys", () => {
  it("puts outcomes first and system noise last", () => {
    const sorted = ["cpu_count", "episode_reward", "epochs", "training/walltime", "mAP50"].sort(compareMetricKeys);
    assert.deepEqual(sorted, ["episode_reward", "mAP50", "epochs", "cpu_count", "training/walltime"]);
  });

  it("flags only outcome-ish metrics as outcomes", () => {
    assert.equal(isOutcomeMetric("episode_reward"), true);
    assert.equal(isOutcomeMetric("epochs"), true);
    assert.equal(isOutcomeMetric("elapsed_seconds"), false);
  });
});
