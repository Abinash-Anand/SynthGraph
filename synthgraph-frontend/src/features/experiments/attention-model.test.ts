import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTENTION_UNAVAILABLE,
  describeAttentionEntries,
  describeAttentionReason,
  describeEmptyAttention,
  type ExperimentAttention,
} from "./attention-model.ts";

const CHECKS = [
  { code: "run_failed", description: "failed runs" },
  { code: "capture_partial", description: "capture reported as partial" },
  { code: "capture_unknown", description: "capture reported as unknown" },
  { code: "capture_not_reported", description: "capture never reported" },
  { code: "drift", description: "drift from earlier completed runs" },
];

describe("describeAttentionReason", () => {
  it("words each reason code the backend can send", () => {
    assert.equal(describeAttentionReason({ code: "run_failed" }), "run failed");
    assert.equal(describeAttentionReason({ code: "capture_partial" }), "capture incomplete");
    assert.equal(describeAttentionReason({ code: "capture_unknown" }), "capture status unknown");
    assert.equal(describeAttentionReason({ code: "capture_not_reported" }), "capture not reported");
  });

  it("counts drifted fields, in the singular and the plural", () => {
    assert.equal(describeAttentionReason({ code: "drift", driftFields: 1 }), "drift in 1 field");
    assert.equal(describeAttentionReason({ code: "drift", driftFields: 3 }), "drift in 3 fields");
  });

  it("shows a code from a newer backend as it is rather than dropping it", () => {
    assert.equal(describeAttentionReason({ code: "disk_full" }), "disk full");
  });
});

describe("describeAttentionEntries", () => {
  const attention: ExperimentAttention = {
    runsChecked: 3,
    checks: CHECKS,
    runs: [
      { trainingRunId: "r-a", reasons: [{ code: "run_failed" }, { code: "drift", driftFields: 2 }] },
      { trainingRunId: "r-unloaded-1234567", reasons: [{ code: "capture_not_reported" }] },
    ],
  };

  it("names the flagged runs and words every reason, in the backend's order", () => {
    const entries = describeAttentionEntries(attention, new Map([["r-a", "run A"]]));

    assert.deepEqual(entries, [
      { runId: "r-a", runName: "run A", reasons: ["run failed", "drift in 2 fields"] },
      { runId: "r-unloaded-1234567", runName: "r-unload", reasons: ["capture not reported"] },
    ]);
  });

  it("flags nothing itself: a run the backend did not flag is not an entry", () => {
    const entries = describeAttentionEntries(
      { runsChecked: 2, checks: CHECKS, runs: [] },
      new Map([
        ["healthy", "healthy"],
        ["failed-looking", "failed"],
      ]),
    );

    assert.deepEqual(entries, []);
  });
});

describe("describeEmptyAttention", () => {
  const text = describeEmptyAttention(CHECKS);

  it("lists every check the backend says it performed", () => {
    for (const check of CHECKS) assert.ok(text.includes(check.description), check.description);
  });

  it("lists only what the backend sent, so the page cannot claim more", () => {
    const narrow = describeEmptyAttention([{ code: "run_failed", description: "failed runs" }]);

    assert.match(narrow, /Checks run here: failed runs\./);
    assert.doesNotMatch(narrow, /capture|drift/);
  });

  it("does not claim that nothing needs attention", () => {
    // Regression: the empty state read "Nothing needs attention", which claimed
    // more than the checks can show.
    assert.doesNotMatch(text, /nothing needs attention/i);
    assert.match(text, /^No runs flagged\./);
  });

  it("says what it does not check", () => {
    assert.match(text, /Metric behaviour/);
    assert.doesNotMatch(text, /are not checked/);
  });
});

describe("when the backend returned no attention result", () => {
  it("says so rather than showing an empty, reassuring panel", () => {
    assert.match(ATTENTION_UNAVAILABLE, /not available from this backend version/);
    assert.doesNotMatch(ATTENTION_UNAVAILABLE, /no runs flagged\.$/i);
  });
});
