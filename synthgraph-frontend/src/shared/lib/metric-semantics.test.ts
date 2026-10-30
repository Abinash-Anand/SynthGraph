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

  it("knows the singular and plural forms of common failure counts and rates", () => {
    // Regression: only the plural forms were listed, so "collision_rate" and
    // "failure_rate" had no direction and a higher-is-better default was applied.
    for (const key of ["collision_rate", "eval/collision_rate", "num_collisions", "failure_rate", "eval/failures"]) {
      assert.equal(metricDirection(key), "lower", key);
    }
    for (const key of ["fall_rate", "violation_rate", "constraint_violations", "crash_count", "validation_errors"]) {
      assert.equal(metricDirection(key), "lower", key);
    }
    assert.equal(metricDirection("success_rate"), "higher");
    assert.equal(metricDirection("episode_rewards"), "higher");
  });

  it("does not treat words that merely contain a listed word as that word", () => {
    for (const key of ["waterfall_height", "rainfall", "recollision_size", "failurex"]) {
      assert.equal(metricDirection(key), "neutral", key);
    }
  });

  it("gives spread metrics no direction, whatever else the name says", () => {
    // Regression: "episode_reward_std" matched "reward" and was read as higher-is-better,
    // so a rising spread showed as improvement.
    for (const key of [
      "eval/episode_reward_std",
      "accuracy_std",
      "value_loss_std",
      "reward_variance",
      "loss_stddev",
      "success_rate_stdev",
      "reward_sigma",
      "eval/episode_reward/std",
    ]) {
      assert.equal(metricDirection(key), "neutral", key);
    }
  });

  it("still reads the direction of the underlying metric", () => {
    assert.equal(metricDirection("eval/episode_reward"), "higher");
    assert.equal(metricDirection("training/policy_loss"), "lower");
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
