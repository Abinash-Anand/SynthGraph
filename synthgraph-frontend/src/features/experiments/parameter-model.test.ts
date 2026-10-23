import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzeParameters,
  classifyParameter,
  etaSquared,
  type ParameterRun,
  spearman,
} from "./parameter-model.ts";

function run(i: number, parameters: Record<string, unknown>, outcome: number | null): ParameterRun {
  return { id: `r${i}`, name: `run-${i}`, parameters, outcome };
}

describe("classifyParameter", () => {
  it("separates seeds from knobs", () => {
    assert.equal(classifyParameter("seed"), "seed");
    assert.equal(classifyParameter("random_state"), "seed");
    assert.equal(classifyParameter("learning_rate"), "hyperparameter");
    assert.equal(classifyParameter("num_timesteps"), "hyperparameter");
    assert.equal(classifyParameter("env_id"), "environment");
    assert.equal(classifyParameter("resolution"), "data");
    assert.equal(classifyParameter("mystery"), "other");
  });
});

describe("spearman", () => {
  it("is +1 for a monotonic increase and -1 for a decrease", () => {
    assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
    assert.equal(spearman([1, 2, 3, 4], [9, 7, 5, 1]), -1);
  });

  it("handles ties without inventing order", () => {
    const rho = spearman([1, 1, 2, 2], [5, 5, 9, 9]);
    assert.ok(rho !== null && Math.abs(rho - 1) < 1e-9);
  });

  it("returns null when either side is constant or too short", () => {
    assert.equal(spearman([1, 1, 1], [1, 2, 3]), null);
    assert.equal(spearman([1, 2], [1, 2]), null);
  });
});

describe("etaSquared", () => {
  it("is 1 when groups explain everything and 0 when they explain nothing", () => {
    assert.equal(etaSquared([[1, 1], [5, 5]]), 1);
    assert.equal(etaSquared([[1, 5], [1, 5]]), 0);
  });
  it("is null without any variance", () => {
    assert.equal(etaSquared([[2, 2], [2, 2]]), null);
  });
});

describe("analyzeParameters - runs that differ only by seed", () => {
  const runs = [run(1, { seed: 1, lr: 0.1 }, 0.0011), run(2, { seed: 2, lr: 0.1 }, 0.0023), run(3, { seed: 3, lr: 0.1 }, 0.0018)];
  const analysis = analyzeParameters(runs);

  it("reports the seed spread as a noise floor, not an effect", () => {
    assert.equal(analysis.seedOnly, true);
    assert.equal(analysis.noiseFloor?.n, 3);
    assert.equal(analysis.noiseFloor?.min, 0.0011);
    assert.equal(analysis.noiseFloor?.max, 0.0023);
    assert.ok((analysis.noiseFloor?.coefficientOfVariation ?? 0) > 0.3);
  });

  it("refuses to estimate an effect from three runs", () => {
    const seed = analysis.effects.find((e) => e.key === "seed");
    assert.equal(seed?.effect, null);
    assert.equal(seed?.reliability, "none");
    assert.match(seed?.note ?? "", /at least 5/);
  });

  it("ignores constant parameters", () => {
    assert.equal(analysis.effects.some((e) => e.key === "lr"), false);
  });
});

describe("analyzeParameters - a real sweep", () => {
  // 8 runs; learning rate drives the outcome up, optimizer is categorical.
  const rates = [0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.128];
  const runs = rates.map((lr, i) =>
    run(i, { lr, optimizer: i % 2 === 0 ? "adam" : "sgd", seed: i }, 10 + i * 2 + (i % 2)),
  );
  const analysis = analyzeParameters(runs);

  it("ranks the stronger parameter first and grades it reliable", () => {
    const lr = analysis.effects.find((e) => e.key === "lr");
    assert.ok(lr);
    assert.equal(lr.kind, "numeric");
    assert.equal(lr.reliability, "ok");
    assert.ok((lr.correlation ?? 0) > 0.95);
    assert.equal(analysis.effects[0].key, "lr");
  });

  it("does not rank the seed even though it is also perfectly ordered", () => {
    const seed = analysis.effects.find((e) => e.key === "seed");
    assert.equal(seed?.role, "seed");
    assert.equal(analysis.seedOnly, false);
  });

  it("grades a categorical parameter by its smallest group", () => {
    const optimizer = analysis.effects.find((e) => e.key === "optimizer");
    assert.equal(optimizer?.kind, "categorical");
    assert.equal(optimizer?.groups.length, 2);
    assert.equal(optimizer?.reliability, "ok");
  });
});

describe("analyzeParameters - edge cases", () => {
  it("skips runs without an outcome", () => {
    const analysis = analyzeParameters([run(1, { lr: 1 }, null), run(2, { lr: 2 }, null)]);
    assert.equal(analysis.usableRuns, 0);
    assert.equal(analysis.effects.length, 0);
  });

  it("flags a categorical parameter used once per value", () => {
    const runs = Array.from({ length: 6 }, (_, i) => run(i, { optimizer: `opt-${i}` }, i));
    const effect = analyzeParameters(runs).effects[0];
    assert.equal(effect.effect, null);
    assert.match(effect.note ?? "", /exactly one run/);
  });
});
