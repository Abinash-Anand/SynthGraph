import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ATTENTION_CHECKS, computeAttentionEntries, describeEmptyAttention } from "./attention-model.ts";

const run = (
  overrides: Partial<{ status: string; capture: string | null; drift: number }> = {},
  name = "run",
) => ({
  run: {
    id: `${name}-id`,
    name,
    status: overrides.status ?? "completed",
    captureStatus: overrides.capture === null || overrides.capture === undefined ? null : { status: overrides.capture },
  },
  drift: { drift: Array.from({ length: overrides.drift ?? 0 }, () => ({})) },
});

describe("computeAttentionEntries", () => {
  it("flags failed runs, partial and unknown capture, and drift", () => {
    const entries = computeAttentionEntries([
      run({ status: "failed" }, "failed"),
      run({ capture: "partial" }, "partial"),
      run({ capture: "unknown" }, "unknown"),
      run({ drift: 1 }, "drift-one"),
      run({ drift: 3 }, "drift-three"),
    ]);
    assert.deepEqual(
      entries.map((entry) => [entry.runName, entry.reasons]),
      [
        ["failed", ["run failed"]],
        ["partial", ["capture incomplete"]],
        ["unknown", ["capture status unknown"]],
        ["drift-one", ["drift in 1 field"]],
        ["drift-three", ["drift in 3 fields"]],
      ],
    );
  });

  it("lists every reason that applies to one run", () => {
    const [entry] = computeAttentionEntries([run({ status: "failed", capture: "partial", drift: 2 })]);
    assert.deepEqual(entry.reasons, ["run failed", "capture incomplete", "drift in 2 fields"]);
  });

  it("leaves healthy runs out", () => {
    assert.deepEqual(computeAttentionEntries([run({ status: "completed", capture: "complete" })]), []);
  });

  it("does not flag a run that never reported capture (captureStatus is null)", () => {
    // Documented limit, not an endorsement: the Capture Completeness report counts these as unknown.
    assert.deepEqual(computeAttentionEntries([run({ capture: null })]), []);
  });
});

describe("describeEmptyAttention", () => {
  const text = describeEmptyAttention();

  it("lists every check that is actually performed", () => {
    for (const check of ATTENTION_CHECKS) assert.ok(text.includes(check.description), check.description);
  });

  it("does not claim that nothing needs attention", () => {
    // Regression: the empty state read "Nothing needs attention", which claimed
    // more than the checks can show.
    assert.doesNotMatch(text, /nothing needs attention/i);
    assert.match(text, /^No runs flagged\./);
  });

  it("says what it does not check", () => {
    assert.match(text, /Metric behaviour/);
    assert.match(text, /never reported capture/);
  });

  it("matches the reasons the rules can produce", () => {
    const produced = new Set(
      computeAttentionEntries([
        run({ status: "failed", capture: "partial", drift: 1 }, "a"),
        run({ capture: "unknown" }, "b"),
      ]).flatMap((entry) => entry.reasons.map((reason) => (reason.startsWith("drift") ? "drift" : reason))),
    );
    assert.deepEqual(new Set(ATTENTION_CHECKS.map((check) => check.reason)), produced);
  });
});
