import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diffLines,
  diffStats,
  displayLines,
  familyWarning,
  groupOf,
  groupRows,
  isDifference,
  isExpandable,
  type MatrixRow,
  numericDelta,
} from "./comparison-model.ts";

const row = (label: string, values: string[], differs: boolean): MatrixRow => ({ label, values, differs });

describe("groupRows", () => {
  it("groups by namespace in a stable order and counts differences", () => {
    const groups = groupRows([
      row("parameters.lr", ["1", "2"], true),
      row("Status", ["done", "done"], false),
      row("metrics.loss", ["1", "1"], false),
      row("parameters.seed", ["1", "1"], false),
    ]);
    assert.deepEqual(groups.map((g) => [g.name, g.rows.length, g.differing]), [
      ["Details", 1, 0],
      ["Parameters", 2, 1],
      ["Metrics", 1, 0],
    ]);
    assert.equal(groupOf("Generator"), "Details");
  });
});

describe("numericDelta", () => {
  it("reports absolute and percent change", () => {
    assert.deepEqual(numericDelta(100, 150), { absolute: 50, percent: 50 });
    assert.deepEqual(numericDelta(0.5, 0.25), { absolute: -0.25, percent: -50 });
  });
  it("has no percent against a zero baseline", () => {
    assert.deepEqual(numericDelta(0, 3), { absolute: 3, percent: null });
  });
  it("is null for equal, non-numeric or non-finite values", () => {
    assert.equal(numericDelta(1, 1), null);
    assert.equal(numericDelta("a", 1), null);
    assert.equal(numericDelta(1, Number.NaN), null);
  });
});

describe("familyWarning", () => {
  it("warns when generators differ, ignoring versions", () => {
    const warning = familyWarning([row("Generator", ["mujoco @ 0.2", "blender @ 5.2", "mujoco @ 0.3"], true)]);
    assert.match(warning ?? "", /different generators \(mujoco, blender\)/);
  });
  it("stays quiet for one generator, or when none is listed", () => {
    assert.equal(familyWarning([row("Generator", ["mujoco @ 1", "mujoco @ 2"], true)]), null);
    assert.equal(familyWarning([row("Status", ["a", "b"], true)]), null);
  });
  it("uses the trainer wording for runs", () => {
    assert.match(familyWarning([row("Trainer", ["ppo", "sac"], true)]) ?? "", /different trainers/);
  });
});

describe("displayLines", () => {
  it("keeps multi-line source as real lines instead of escaped text", () => {
    const lines = displayLines({ source: "def f():\n  return 1", mode: "fast" });
    assert.deepEqual(lines, ["source: |", "  def f():", "    return 1", "mode: fast"]);
  });
  it("handles primitives, null, arrays and empties", () => {
    assert.deepEqual(displayLines(3), ["3"]);
    assert.deepEqual(displayLines(null), ["null"]);
    assert.deepEqual(displayLines([]), ["[]"]);
    assert.deepEqual(displayLines({}), ["{}"]);
    assert.deepEqual(displayLines(["a"]), ["-", "  a"]);
  });
});

describe("diffLines", () => {
  it("marks added and removed lines around the common ones", () => {
    const ops = diffLines(["a", "b", "c"], ["a", "x", "c", "d"]);
    assert.deepEqual(ops, [
      { kind: "same", text: "a" },
      { kind: "remove", text: "b" },
      { kind: "add", text: "x" },
      { kind: "same", text: "c" },
      { kind: "add", text: "d" },
    ]);
    assert.deepEqual(diffStats(ops), { added: 2, removed: 1 });
  });
  it("is all same for identical input and all add/remove against empty", () => {
    assert.ok(diffLines(["a"], ["a"]).every((op) => op.kind === "same"));
    assert.deepEqual(diffLines([], ["a"]), [{ kind: "add", text: "a" }]);
    assert.deepEqual(diffLines(["a"], []), [{ kind: "remove", text: "a" }]);
  });
});

describe("isExpandable", () => {
  it("expands objects, multi-line and long strings but not short scalars", () => {
    assert.equal(isExpandable({ a: 1 }, '{"a":1}'), true);
    assert.equal(isExpandable("a\nb", "a\nb"), true);
    assert.equal(isExpandable("x".repeat(60), "x".repeat(60)), true);
    assert.equal(isExpandable("GPU", "GPU"), false);
    assert.equal(isExpandable(3, "3"), false);
  });
});

describe("informational rows", () => {
  const timestamps: MatrixRow = { label: "Started", values: ["a", "b"], differs: true, informational: true };
  const real: MatrixRow = { label: "parameters.lr", values: ["1", "2"], differs: true };

  it("are not differences even though the values differ", () => {
    assert.equal(isDifference(timestamps), false);
    assert.equal(isDifference(real), true);
    assert.equal(isDifference({ label: "x", values: ["1", "1"], differs: false }), false);
  });

  it("do not count towards a group's differing total", () => {
    const groups = groupRows([timestamps, { label: "Generator", values: ["a", "b"], differs: true }, real]);
    const details = groups.find((g) => g.name === "Details");
    assert.equal(details?.rows.length, 2);
    assert.equal(details?.differing, 1);
    assert.equal(groups.find((g) => g.name === "Parameters")?.differing, 1);
  });
});
