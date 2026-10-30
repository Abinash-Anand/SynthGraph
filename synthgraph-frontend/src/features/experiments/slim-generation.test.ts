import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slimGeneration } from "./slim-generation.ts";
import type { EnrichedGeneration } from "./types/experiment-workspace";

const enriched = (extra: object, manifestExtra: object | null, manifestTop: object = {}): EnrichedGeneration =>
  ({
    generation: { id: "g1", name: "g", parameters: { lr: 0.1 }, ...extra },
    manifest: manifestExtra
      ? { generation: { id: "g1", parameters: { lr: 0.1 }, ...manifestExtra }, classification: {}, ...manifestTop }
      : null,
  }) as unknown as EnrichedGeneration;

describe("slimGeneration", () => {
  it("drops the normalized mirror from the generation and its manifest, keeping the parameters", () => {
    const slim = slimGeneration(
      enriched({ normalized: { lr: 0.1 } }, { normalized: { lr: 0.1 } }, { normalized: { lr: 0.1 } }),
    );
    assert.equal("normalized" in slim.generation, false);
    assert.equal("normalized" in (slim.manifest ?? {}), false);
    assert.equal("normalized" in (slim.manifest?.generation ?? {}), false);
    assert.deepEqual(slim.generation.parameters, { lr: 0.1 });
    assert.deepEqual(slim.manifest?.generation.parameters, { lr: 0.1 });
  });

  it("returns untouched objects when there is nothing to drop, and tolerates a missing manifest", () => {
    const input = enriched({}, null);
    const slim = slimGeneration(input);
    assert.equal(slim.generation, input.generation);
    assert.equal(slim.manifest, null);
  });

  it("does not mutate its input", () => {
    const input = enriched({ normalized: { lr: 0.1 } }, null);
    slimGeneration(input);
    assert.equal("normalized" in input.generation, true);
  });

  it("preserves a manifest error so the UI can still report it", () => {
    const slim = slimGeneration({ ...enriched({}, null), manifestError: "rate_limited" });
    assert.equal(slim.manifestError, "rate_limited");
  });
});
