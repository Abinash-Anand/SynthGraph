import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregatedDirection,
  canRank,
  declaredDirection,
  directionLabel,
  noRankingReason,
  rankingDirection,
  verdictOf,
} from "./metric-direction.ts";

describe("declaredDirection", () => {
  const directions = { loss: "minimize", accuracy: "maximize", lr: "neutral" } as const;

  it("returns exactly what was declared", () => {
    assert.equal(declaredDirection(directions, "loss"), "minimize");
    assert.equal(declaredDirection(directions, "accuracy"), "maximize");
    assert.equal(declaredDirection(directions, "lr"), "neutral");
  });

  it("returns null for a metric nobody declared, whatever its name looks like", () => {
    for (const key of ["policy_loss", "episode_reward", "mAP50", "collision_rate", "val_error"]) {
      assert.equal(declaredDirection(directions, key), null, key);
    }
  });

  it("does not let a declared name decide for a similar one", () => {
    assert.equal(declaredDirection({ loss: "maximize" }, "loss"), "maximize");
    assert.equal(declaredDirection({ loss: "maximize" }, "training/loss"), null);
  });

  it("treats a missing map as nothing declared", () => {
    assert.equal(declaredDirection(undefined, "loss"), null);
    assert.equal(declaredDirection(null, "loss"), null);
    assert.equal(declaredDirection({}, "loss"), null);
  });

  it("ignores inherited object properties", () => {
    for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      assert.equal(declaredDirection({}, key), null, key);
    }
  });
});

describe("aggregatedDirection", () => {
  const aggregated = {
    loss: { direction: "minimize", mixed: false },
    reward: { direction: null, mixed: true },
  } as const;

  it("returns the agreed direction", () => {
    assert.deepEqual(aggregatedDirection(aggregated, "loss"), { direction: "minimize", mixed: false });
  });

  it("returns no direction for a mixed metric", () => {
    assert.deepEqual(aggregatedDirection(aggregated, "reward"), { direction: null, mixed: true });
  });

  it("returns no direction, and not mixed, for a metric nobody declared", () => {
    assert.deepEqual(aggregatedDirection(aggregated, "accuracy"), { direction: null, mixed: false });
    assert.deepEqual(aggregatedDirection(undefined, "accuracy"), { direction: null, mixed: false });
    assert.deepEqual(aggregatedDirection({}, "constructor"), { direction: null, mixed: false });
  });
});

describe("rankingDirection and canRank", () => {
  it("only maximize and minimize can rank", () => {
    assert.equal(rankingDirection("maximize"), "maximize");
    assert.equal(rankingDirection("minimize"), "minimize");
    assert.equal(rankingDirection("neutral"), null);
    assert.equal(rankingDirection(null), null);
    assert.equal(rankingDirection(undefined), null);
  });

  it("canRank follows the declaration", () => {
    assert.equal(canRank({ a: "maximize", b: "neutral" }, "a"), true);
    assert.equal(canRank({ a: "maximize", b: "neutral" }, "b"), false);
    assert.equal(canRank({ a: "maximize" }, "c"), false);
  });
});

describe("labels", () => {
  it("say declared, never inferred", () => {
    assert.equal(directionLabel("maximize"), "higher is better (declared)");
    assert.equal(directionLabel("minimize"), "lower is better (declared)");
    assert.match(directionLabel("neutral"), /no better direction/);
    assert.equal(directionLabel(null), "no direction declared");
    for (const label of [directionLabel("maximize"), directionLabel(null), noRankingReason(null)]) {
      assert.doesNotMatch(label, /infer/i);
    }
  });

  it("explains why a metric cannot be ranked", () => {
    assert.match(noRankingReason(null), /No direction has been declared/);
    assert.match(noRankingReason("neutral"), /no better direction/);
    assert.match(noRankingReason(null, true), /disagree/);
  });
});

describe("verdictOf", () => {
  it("passes through the backend verdicts and defaults the rest to neutral", () => {
    assert.equal(verdictOf("improving"), "improving");
    assert.equal(verdictOf("worsening"), "worsening");
    assert.equal(verdictOf("neutral"), "neutral");
    assert.equal(verdictOf(undefined), "neutral");
    assert.equal(verdictOf(null), "neutral");
  });
});
