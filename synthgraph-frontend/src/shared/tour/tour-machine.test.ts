import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IDLE, isLastStep, reduceTour, resolveSteps } from "./tour-machine.ts";

const active = (index: number, count = 3) => ({ phase: "active" as const, index, count });

describe("reduceTour", () => {
  it("starts at the first step", () => {
    assert.deepEqual(reduceTour(IDLE, { type: "start", count: 3 }), active(0));
  });

  it("refuses to start a tour with no resolvable steps", () => {
    assert.deepEqual(reduceTour(IDLE, { type: "start", count: 0 }), IDLE);
  });

  it("advances, and goes idle after the last step", () => {
    assert.deepEqual(reduceTour(active(0), { type: "next" }), active(1));
    assert.deepEqual(reduceTour(active(2), { type: "next" }), IDLE);
  });

  it("never goes back past the first step", () => {
    assert.deepEqual(reduceTour(active(0), { type: "prev" }), active(0));
    assert.deepEqual(reduceTour(active(2), { type: "prev" }), active(1));
  });

  it("clamps goto into range", () => {
    assert.deepEqual(reduceTour(active(0), { type: "goto", index: 99 }), active(2));
    assert.deepEqual(reduceTour(active(1), { type: "goto", index: -4 }), active(0));
  });

  it("stop always returns to idle", () => {
    assert.deepEqual(reduceTour(active(1), { type: "stop" }), IDLE);
  });

  it("ignores navigation while idle", () => {
    for (const type of ["next", "prev"] as const) {
      assert.deepEqual(reduceTour(IDLE, { type }), IDLE);
    }
    assert.deepEqual(reduceTour(IDLE, { type: "goto", index: 1 }), IDLE);
  });
});

describe("isLastStep", () => {
  it("is true only on the final active step", () => {
    assert.equal(isLastStep(active(2)), true);
    assert.equal(isLastStep(active(1)), false);
    assert.equal(isLastStep(IDLE), false);
  });
});

describe("resolveSteps", () => {
  const steps = [
    { id: "a", title: "A", body: "" },
    { id: "b", target: "present", title: "B", body: "" },
    { id: "c", target: "missing", title: "C", body: "" },
  ];

  it("keeps targetless steps and steps whose target exists, drops the rest", () => {
    const resolved = resolveSteps(steps, (target) => target === "present");
    assert.deepEqual(
      resolved.map((step) => step.id),
      ["a", "b"],
    );
  });

  it("returns nothing when no target exists and every step needs one", () => {
    assert.deepEqual(resolveSteps(steps.slice(1), () => false), []);
  });
});
