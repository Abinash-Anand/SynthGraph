import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slimGeneration, withManifestParameters } from "./slim-generation.ts";
import type { EnrichedGeneration } from "./types/experiment-workspace";

const enriched = (extra: object, manifestExtra: object | null, manifestTop: object = {}): EnrichedGeneration =>
  ({
    generation: { id: "g1", name: "g", parameters: { lr: 0.1 }, ...extra },
    manifest: manifestExtra
      ? { generation: { id: "g1", parameters: { lr: 0.1 }, ...manifestExtra }, classification: {}, ...manifestTop }
      : null,
  }) as unknown as EnrichedGeneration;

describe("slimGeneration", () => {
  it("drops the normalized mirror from the generation and its manifest, keeping the generation's parameters", () => {
    const slim = slimGeneration(
      enriched({ normalized: { lr: 0.1 } }, { normalized: { lr: 0.1 } }, { normalized: { lr: 0.1 } }),
    );
    assert.equal("normalized" in slim.generation, false);
    assert.equal("normalized" in (slim.manifest ?? {}), false);
    assert.equal("normalized" in (slim.manifest?.generation ?? {}), false);
    assert.deepEqual(slim.generation.parameters, { lr: 0.1 });
  });

  it("does not send the manifest's copy of the parameters, which the generation already carries", () => {
    const source = "def domain_randomize(model, rng):\n    return model\n".repeat(50);
    const input = enriched({ parameters: { domain_randomize: { source } } }, { parameters: { domain_randomize: { source } } });
    const slim = slimGeneration(input);
    assert.deepEqual(slim.manifest?.generation.parameters, {});
    assert.deepEqual(slim.generation.parameters, { domain_randomize: { source } });
    assert.equal(JSON.stringify(slim.manifest).includes("def domain_randomize"), false);
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

  it("puts the parameters back for display, reproducing the manifest exactly as it arrived", () => {
    const parameters = { env_config: { Kp: 35 }, domain_randomize: { source: "def f(): pass" } };
    const manifest = {
      schemaVersion: "1.0",
      classification: { known: [], supplied: [], missing: [], external: [] },
      generation: {
        id: "g1",
        experimentId: "e1",
        name: "g",
        description: null,
        generator: { name: "x" },
        parameters,
        reproducibility: { seed: 1 },
        status: "completed",
        inputs: [],
        outputs: [],
      },
      datasetReferences: [],
    };
    const input = { generation: { id: "g1", parameters }, manifest } as unknown as EnrichedGeneration;

    const restored = withManifestParameters(slimGeneration(input));

    // Same content and the same key order, so the raw manifest view reads as before.
    assert.equal(JSON.stringify(restored), JSON.stringify(manifest));
  });

  it("has no manifest to restore when none was loaded", () => {
    assert.equal(withManifestParameters(slimGeneration(enriched({}, null))), null);
  });
});
