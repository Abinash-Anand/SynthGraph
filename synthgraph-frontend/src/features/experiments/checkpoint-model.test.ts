import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CheckpointEvaluation,
  checkpointAxisFor,
  checkpointPoints,
  describeCheckpointAxis,
  hasCheckpointStep,
  inRecordedOrder,
  latestEvaluation,
} from "./checkpoint-model.ts";

const ev = (value: number, checkpointStep?: number | null, createdAt?: string, name?: string) => ({
  metrics: { m: value },
  checkpointStep,
  createdAt,
  name,
});

describe("hasCheckpointStep", () => {
  it("accepts a recorded whole step, including zero", () => {
    assert.equal(hasCheckpointStep({ checkpointStep: 0 }), true);
    assert.equal(hasCheckpointStep({ checkpointStep: 20160 }), true);
  });

  it("treats null, missing and malformed values as not recorded", () => {
    for (const checkpointStep of [null, undefined, -1, 1.5, Number.NaN, "10" as unknown as number]) {
      assert.equal(hasCheckpointStep({ checkpointStep }), false, String(checkpointStep));
    }
  });

  it("never reads the name", () => {
    assert.equal(hasCheckpointStep({ checkpointStep: null, name: "go1-eval-run3-step20160" } as never), false);
  });
});

describe("checkpointAxisFor", () => {
  it("uses the step axis only when every plotted evaluation has a recorded step", () => {
    const summary = checkpointAxisFor([{ evaluations: [ev(1, 100), ev(2, 200)] }, { evaluations: [ev(3, 100)] }], "m");
    assert.deepEqual(summary, { axis: "step", total: 3, missing: 0 });
  });

  it("falls back to recorded order for the whole chart when one evaluation has no step", () => {
    const summary = checkpointAxisFor([{ evaluations: [ev(1, 100), ev(2, 200)] }, { evaluations: [ev(3, null)] }], "m");
    assert.deepEqual(summary, { axis: "recorded", total: 3, missing: 1 });
  });

  it("ignores evaluations that did not report the metric", () => {
    const runs = [{ evaluations: [ev(1, 100), { metrics: { other: 1 }, checkpointStep: null }, { metrics: { m: "n/a" } }] }];
    assert.deepEqual(checkpointAxisFor(runs, "m"), { axis: "step", total: 1, missing: 0 });
  });

  it("does not treat a step in the name as a recorded step", () => {
    const named = { metrics: { m: 1 }, name: "go1-eval-run3-step20160" } as CheckpointEvaluation;
    assert.equal(checkpointAxisFor([{ evaluations: [named] }], "m").axis, "recorded");
  });
});

describe("checkpointPoints", () => {
  it("plots at the recorded steps, in step order, whatever order they were saved in", () => {
    const points = checkpointPoints([ev(3, 300), ev(1, 100), ev(2, 200)], "m", "step");
    assert.deepEqual(points, [
      [100, 1],
      [200, 2],
      [300, 3],
    ]);
  });

  it("keeps two evaluations at the same step, in the order they were recorded", () => {
    const points = checkpointPoints(
      [ev(9, 100, "2026-01-02T00:00:00Z"), ev(8, 100, "2026-01-01T00:00:00Z")],
      "m",
      "step",
    );
    assert.deepEqual(points, [
      [100, 8],
      [100, 9],
    ]);
  });

  it("plots by the order recorded, from 1, when there is no step axis", () => {
    const points = checkpointPoints(
      [
        ev(30, null, "2026-01-03T00:00:00Z"),
        ev(10, null, "2026-01-01T00:00:00Z"),
        ev(20, null, "2026-01-02T00:00:00Z"),
      ],
      "m",
      "recorded",
    );
    assert.deepEqual(points, [
      [1, 10],
      [2, 20],
      [3, 30],
    ]);
  });

  it("does not count evaluations without the metric in the recorded position", () => {
    const points = checkpointPoints(
      [ev(1, null, "2026-01-01T00:00:00Z"), { metrics: { other: 5 } }, ev(2, null, "2026-01-03T00:00:00Z")],
      "m",
      "recorded",
    );
    assert.deepEqual(points, [
      [1, 1],
      [2, 2],
    ]);
  });

  it("ignores a step in the name when plotting", () => {
    const named = [
      { metrics: { m: 1 }, name: "x-step900", createdAt: "2026-01-01T00:00:00Z" },
      { metrics: { m: 2 }, name: "x-step100", createdAt: "2026-01-02T00:00:00Z" },
    ] as unknown as CheckpointEvaluation[];
    assert.deepEqual(checkpointPoints(named, "m", "recorded"), [
      [1, 1],
      [2, 2],
    ]);
  });
});

describe("inRecordedOrder", () => {
  it("sorts by time and keeps the listed order for ties and missing times", () => {
    const a = ev(1);
    const b = ev(2);
    const c = ev(3, null, "2026-01-01T00:00:00Z");
    assert.deepEqual(inRecordedOrder([a, b]), [a, b]);
    assert.deepEqual(inRecordedOrder([c, a, b]).map((e) => e.metrics.m), [1, 2, 3]);
  });
});

describe("latestEvaluation", () => {
  it("is the highest step when every candidate has one", () => {
    const last = ev(2, 500, "2026-01-01T00:00:00Z");
    // The higher step was recorded earlier: the step decides, not the timestamp.
    assert.equal(latestEvaluation([ev(1, 100, "2026-01-05T00:00:00Z"), last]), last);
  });

  it("is the one recorded last when any candidate has no step", () => {
    const newest = ev(2, null, "2026-01-09T00:00:00Z");
    assert.equal(latestEvaluation([ev(1, 9000, "2026-01-01T00:00:00Z"), newest]), newest);
  });

  it("returns null for no candidates", () => {
    assert.equal(latestEvaluation([]), null);
  });
});

describe("describeCheckpointAxis", () => {
  it("says nothing when every step is recorded or there is nothing to plot", () => {
    assert.equal(describeCheckpointAxis({ axis: "step", total: 3, missing: 0 }), null);
    assert.equal(describeCheckpointAxis({ axis: "recorded", total: 0, missing: 0 }), null);
  });

  it("says how many have no recorded step", () => {
    assert.equal(
      describeCheckpointAxis({ axis: "recorded", total: 5, missing: 2 }),
      "2 of 5 evaluations have no recorded checkpoint step, so they are shown in the order they were recorded.",
    );
    assert.equal(
      describeCheckpointAxis({ axis: "recorded", total: 4, missing: 4 }),
      "None of these evaluations has a recorded checkpoint step, so they are shown in the order they were recorded.",
    );
  });

  it("does not talk about names", () => {
    assert.doesNotMatch(describeCheckpointAxis({ axis: "recorded", total: 2, missing: 1 }) ?? "", /name/i);
  });
});
