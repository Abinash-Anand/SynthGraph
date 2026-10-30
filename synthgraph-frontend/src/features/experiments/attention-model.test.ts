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
    // Omitted means a run that reported complete capture; null means it never reported.
    captureStatus:
      overrides.capture === undefined ? { status: "complete" } : overrides.capture === null ? null : { status: overrides.capture },
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

  it("flags a run that never reported capture, as the Capture Completeness report counts it", () => {
    // Regression: Overview flagged only an explicit "unknown", so a run with a null
    // captureStatus was counted as unknown by the report but not flagged here.
    const [entry] = computeAttentionEntries([run({ capture: null }, "silent")]);
    assert.deepEqual(entry.reasons, ["capture not reported"]);
  });

  it("flags a run that is still running and has not reported capture, like the report", () => {
    const entries = computeAttentionEntries([run({ status: "running", capture: null }, "running")]);
    assert.deepEqual(entries.map((e) => e.reasons), [["capture not reported"]]);
  });

  it("agrees with the capture report on which runs have no complete capture", () => {
    // The report buckets by `captureStatus?.status ?? "unknown"`; partial and unknown
    // there are exactly the runs flagged here for capture.
    const runs = [
      run({ capture: "complete" }, "complete"),
      run({ capture: "partial" }, "partial"),
      run({ capture: "unknown" }, "unknown"),
      run({ capture: null }, "never"),
    ];
    const reportNeedsAttention = runs
      .filter((r) => ["partial", "unknown"].includes(r.run.captureStatus?.status ?? "unknown"))
      .map((r) => r.run.name);
    const flaggedForCapture = computeAttentionEntries(runs)
      .filter((entry) => entry.reasons.some((reason) => reason.startsWith("capture")))
      .map((entry) => entry.runName);
    assert.deepEqual(flaggedForCapture, reportNeedsAttention);
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

  it("says what it does not check, and no longer lists never-reported capture there", () => {
    assert.match(text, /Metric behaviour/);
    assert.match(text, /capture never reported/); // now a check that is run
    assert.doesNotMatch(text, /are not checked/);
  });

  it("matches the reasons the rules can produce", () => {
    const produced = new Set(
      computeAttentionEntries([
        run({ status: "failed", capture: "partial", drift: 1 }, "a"),
        run({ capture: "unknown" }, "b"),
        run({ capture: null }, "c"),
      ]).flatMap((entry) => entry.reasons.map((reason) => (reason.startsWith("drift") ? "drift" : reason))),
    );
    assert.deepEqual(new Set(ATTENTION_CHECKS.map((check) => check.reason)), produced);
  });
});
