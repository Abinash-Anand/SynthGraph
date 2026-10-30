import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAPTURE_RUNS_UNAVAILABLE,
  type CaptureIssue,
  describeCaptureIssue,
  parseStatusFilter,
  weakestFirst,
} from "./capture-model.ts";

describe("describeCaptureIssue", () => {
  it("words a reported but never attached integration", () => {
    assert.equal(
      describeCaptureIssue({ kind: "not_attached", integration: "tensorboard" }),
      "tensorboard was reported but never attached.",
    );
  });

  it("words an integration attached but never closed", () => {
    assert.match(
      describeCaptureIssue({ kind: "never_closed", integration: "tensorboard" }),
      /^tensorboard attached but was never closed out, so its data may be incomplete\.$/,
    );
  });

  it("says how many runs report an integration this one is missing", () => {
    assert.equal(
      describeCaptureIssue({ kind: "not_reported", integration: "resource_monitor", reportedBy: 8, totalRuns: 10 }),
      "resource_monitor is reported by 8 of 10 runs but not this one.",
    );
  });

  it("shows an issue kind from a newer backend rather than dropping it", () => {
    const future = { kind: "wrong_version", integration: "wandb" } as unknown as CaptureIssue;

    assert.equal(describeCaptureIssue(future), "wandb: wrong version.");
  });

  it("decides nothing: it words exactly the issue it is given", () => {
    // No majority arithmetic here: a "not_reported" issue is worded even for a
    // minority, because whether to flag it is the backend's call.
    assert.match(
      describeCaptureIssue({ kind: "not_reported", integration: "x", reportedBy: 1, totalRuns: 10 }),
      /1 of 10 runs/,
    );
  });
});

describe("weakestFirst", () => {
  const health = (integration: string, closeRate: number) => ({
    integration,
    total: 10,
    attached: 10,
    closed: closeRate * 10,
    dangling: 10 - closeRate * 10,
    closeRate,
    coverage: 1,
  });

  it("orders by close rate, then name, without changing the ratings", () => {
    const ordered = weakestFirst([health("b", 1), health("tensorboard", 0.5), health("a", 1)]);

    assert.deepEqual(ordered.map((h) => h.integration), ["tensorboard", "a", "b"]);
    assert.equal(ordered[0].closeRate, 0.5);
  });

  it("does not modify the list it is given", () => {
    const input = [health("b", 1), health("a", 0)];
    weakestFirst(input);

    assert.deepEqual(input.map((h) => h.integration), ["b", "a"]);
  });
});

describe("parseStatusFilter", () => {
  it("accepts only the three statuses", () => {
    assert.equal(parseStatusFilter("partial"), "partial");
    assert.equal(parseStatusFilter("bogus"), null);
    assert.equal(parseStatusFilter(undefined), null);
  });
});

describe("when the backend returned no runs", () => {
  it("says so rather than implying nothing needs fixing", () => {
    assert.match(CAPTURE_RUNS_UNAVAILABLE, /not available from this backend version/);
  });
});
