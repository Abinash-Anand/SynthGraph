import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeRunCapture, integrationHealth, parseStatusFilter } from "./capture-model.ts";

const byIntegration = {
  resource_monitor: { total: 8, attached: 8, closed: 8 },
  tensorboard: { total: 2, attached: 2, closed: 1 },
};

describe("describeRunCapture", () => {
  it("is empty for a run with everything attached and closed", () => {
    assert.deepEqual(
      describeRunCapture({ resource_monitor: { attached: true, closed: true } }, byIntegration, 10),
      [],
    );
  });

  it("flags an integration that was attached but never closed", () => {
    const issues = describeRunCapture({ tensorboard: { attached: true, closed: false } }, byIntegration, 10);
    assert.equal(issues.find((i) => i.integration === "tensorboard")?.kind, "never-closed");
  });

  it("flags one that was reported but never attached", () => {
    const issues = describeRunCapture({ tensorboard: { attached: false, closed: false } }, byIntegration, 10);
    assert.equal(issues[0].kind, "not-attached");
  });

  it("flags a missing integration only when most runs have it", () => {
    const issues = describeRunCapture({}, byIntegration, 10);
    assert.deepEqual(issues.map((i) => i.integration), ["resource_monitor"]);
    assert.equal(issues[0].kind, "not-reported");
    assert.match(issues[0].message, /8 of 10 runs/);
  });

  it("treats a run that never reported capture at all as reporting nothing", () => {
    assert.equal(describeRunCapture(null, byIntegration, 10).length, 1);
    assert.deepEqual(describeRunCapture(undefined, {}, 0), []);
  });
});

describe("integrationHealth", () => {
  it("rates each integration and puts the worst first", () => {
    const health = integrationHealth(byIntegration, 10);
    assert.deepEqual(health.map((h) => h.integration), ["tensorboard", "resource_monitor"]);
    assert.equal(health[0].closeRate, 0.5);
    assert.equal(health[0].dangling, 1);
    assert.equal(health[1].coverage, 0.8);
  });
  it("handles an integration nobody reported", () => {
    assert.equal(integrationHealth({ x: { total: 0, attached: 0, closed: 0 } }, 0)[0].closeRate, 0);
  });
});

describe("parseStatusFilter", () => {
  it("accepts only the three statuses", () => {
    assert.equal(parseStatusFilter("partial"), "partial");
    assert.equal(parseStatusFilter("bogus"), null);
    assert.equal(parseStatusFilter(undefined), null);
  });
});
