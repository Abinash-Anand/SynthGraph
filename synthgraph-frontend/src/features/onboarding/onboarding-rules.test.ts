import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChecklist, checklistProgress, decideWelcomeMode, isSeen } from "./onboarding-rules.ts";

describe("isSeen", () => {
  it("treats a missing key as unseen", () => {
    assert.equal(isSeen({}, "welcome", 1), false);
  });

  it("is seen at the same or a newer version, unseen when content has moved on", () => {
    assert.equal(isSeen({ welcome: 1 }, "welcome", 1), true);
    assert.equal(isSeen({ welcome: 2 }, "welcome", 1), true);
    assert.equal(isSeen({ welcome: 1 }, "welcome", 2), false);
  });
});

describe("decideWelcomeMode", () => {
  it("auto-starts for an empty, never-toured account", () => {
    assert.equal(decideWelcomeMode({ seen: {}, version: 1, projectCount: 0 }), "auto");
  });

  it("offers a banner instead of a modal when the account already has projects", () => {
    assert.equal(decideWelcomeMode({ seen: {}, version: 1, projectCount: 4 }), "banner");
  });

  it("stays quiet once the tour was completed or skipped", () => {
    assert.equal(decideWelcomeMode({ seen: { welcome: 1 }, version: 1, projectCount: 0 }), "none");
    assert.equal(decideWelcomeMode({ seen: { welcome: 1 }, version: 1, projectCount: 9 }), "none");
  });

  it("re-offers when the tour's version was bumped", () => {
    assert.equal(decideWelcomeMode({ seen: { welcome: 1 }, version: 2, projectCount: 0 }), "auto");
  });
});

describe("buildChecklist", () => {
  it("starts with nothing done for a brand-new account", () => {
    const items = buildChecklist({ projectCount: 0, trainingRunCount: 0, workspaceSeen: false });
    assert.deepEqual(
      items.map((item) => item.done),
      [false, false, false],
    );
  });

  it("derives each item from real data", () => {
    const items = buildChecklist({ projectCount: 2, trainingRunCount: 0, workspaceSeen: true });
    assert.deepEqual(
      items.map((item) => [item.id, item.done]),
      [
        ["project", true],
        ["training-run", false],
        ["workspace", true],
      ],
    );
  });
});

describe("checklistProgress", () => {
  it("reports counts and completion", () => {
    const partial = buildChecklist({ projectCount: 1, trainingRunCount: 0, workspaceSeen: false });
    assert.deepEqual(checklistProgress(partial), { done: 1, total: 3, complete: false });

    const full = buildChecklist({ projectCount: 1, trainingRunCount: 5, workspaceSeen: true });
    assert.deepEqual(checklistProgress(full), { done: 3, total: 3, complete: true });
  });
});
