import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessReproducibility,
  type ClassificationLike,
  compareByRisk,
  summarizeReproducibility,
} from "./reproducibility-model.ts";

const fields = (n: number) => Array.from({ length: n }, (_, i) => ({ field: `f${i}` }));
const classification = (known: number, supplied = 0, external = 0, missing = 0): ClassificationLike => ({
  known: fields(known),
  supplied: fields(supplied),
  external: fields(external),
  missing: Array.from({ length: missing }, (_, i) => `m${i}`),
});
const clean = { seed: 1, code_version: "abc123", environment: { dirty: false } };

describe("assessReproducibility", () => {
  it("is reproducible when nearly everything is recorded and nothing blocks", () => {
    const result = assessReproducibility(classification(9, 1, 0, 0), clean);
    assert.equal(result.grade, "reproducible");
    assert.equal(result.score, 1);
    assert.deepEqual(result.blockers, []);
  });

  it("scores external fields at half", () => {
    const result = assessReproducibility(classification(2, 0, 2, 0), clean);
    assert.equal(result.score, 0.75);
    assert.equal(result.grade, "mostly");
    assert.match(result.notes[0], /2 inputs live outside SynthGraph/);
  });

  it("caps a perfect score at partial when the code was dirty", () => {
    const result = assessReproducibility(classification(10), { ...clean, environment: { dirty: true } });
    assert.equal(result.score, 1);
    assert.equal(result.grade, "partial");
    assert.match(result.blockers[0], /uncommitted changes/);
  });

  it("caps at mostly when the seed or the code version is missing", () => {
    const noCodeVersion: ClassificationLike = { ...classification(9), missing: ["Code version"] };
    assert.equal(assessReproducibility(classification(10), { code_version: "abc" }).grade, "mostly");
    assert.equal(assessReproducibility(noCodeVersion, { seed: 3 }).grade, "mostly");
    const both = assessReproducibility(noCodeVersion, {});
    assert.equal(both.blockers.length, 2);
  });

  it("grades by share recorded when nothing blocks", () => {
    assert.equal(assessReproducibility(classification(7, 0, 0, 3), clean).grade, "mostly");
    assert.equal(assessReproducibility(classification(3, 0, 0, 7), clean).grade, "partial");
  });

  it("says unknown without a manifest and lists what's missing", () => {
    const unknown = assessReproducibility(null, clean);
    assert.equal(unknown.grade, "unknown");
    assert.equal(unknown.score, null);
    const missing = assessReproducibility(classification(1, 0, 0, 2), clean);
    assert.match(missing.notes.join(" "), /Not recorded: m0, m1/);
  });

  it("is unknown for a manifest with no fields at all", () => {
    assert.equal(assessReproducibility(classification(0), clean).grade, "unknown");
  });
});

describe("summarizeReproducibility", () => {
  it("counts grades and averages the scores that exist", () => {
    const summary = summarizeReproducibility([
      assessReproducibility(classification(10), clean),
      assessReproducibility(classification(5, 0, 0, 5), clean),
      assessReproducibility(null, clean),
    ]);
    assert.equal(summary.total, 3);
    assert.deepEqual(summary.byGrade, { reproducible: 1, mostly: 0, partial: 1, unknown: 1 });
    assert.equal(summary.averageScore, 0.75);
  });
  it("has no average with no scores", () => {
    assert.equal(summarizeReproducibility([]).averageScore, null);
  });
});

describe("compareByRisk", () => {
  it("sorts the least reproducible first", () => {
    const good = assessReproducibility(classification(10), clean);
    const weak = assessReproducibility(classification(3, 0, 0, 7), clean);
    const none = assessReproducibility(null, clean);
    assert.deepEqual([good, weak, none].sort(compareByRisk).map((a) => a.grade), ["unknown", "partial", "reproducible"]);
  });
});

describe("blocker tags", () => {
  it("gives a short tag per blocker, in the same order", () => {
    const dirtyNoSeed = assessReproducibility(classification(10), { code_version: "abc", environment: { dirty: true } });
    assert.deepEqual(dirtyNoSeed.blockerTags, ["uncommitted code", "no seed"]);
    assert.equal(dirtyNoSeed.blockers.length, dirtyNoSeed.blockerTags.length);
    assert.deepEqual(assessReproducibility(classification(10), clean).blockerTags, []);
    assert.deepEqual(assessReproducibility(null, clean).blockerTags, []);
  });
});

describe("code version comes from the backend's classification", () => {
  // A backend at classification version 2 counts the commit the SDK records
  // under environment.commit as the code version: it lists it as known, not
  // missing. This model only reads that classification.
  const codeVersionKnown = (): ClassificationLike => ({
    known: [...fields(7), { field: "Code version", value: "3f2a9c1d" }],
    supplied: fields(2),
    external: [],
    missing: ["Configuration hash"],
  });
  const codeVersionMissing = (): ClassificationLike => ({
    known: fields(8),
    supplied: fields(2),
    external: [],
    missing: ["Code version", "Configuration hash"],
  });
  const clean = { seed: 0, environment: { dirty: false } };

  it("does not call a code version the backend knows 'no code version'", () => {
    const result = assessReproducibility(codeVersionKnown(), clean);
    assert.deepEqual(result.blockerTags, []);
    assert.equal(result.counts.known, 8);
    assert.match(result.notes.join(" "), /Not recorded: Configuration hash/);
  });

  it("blocks and counts a code version the backend lists as missing", () => {
    const result = assessReproducibility(codeVersionMissing(), clean);
    assert.deepEqual(result.blockerTags, ["no code version"]);
    assert.equal(result.counts.missing, 2);
    assert.match(result.notes.join(" "), /Not recorded: Code version, Configuration hash/);
  });

  it("does not second-guess the backend from the environment", () => {
    // Regression: this model used to delete "Code version" from the backend's
    // missing list when environment.commit existed. The backend now owns that
    // rule, so a commit in the environment changes nothing here.
    const withCommit = { seed: 0, environment: { dirty: false, commit: "3f2a9c1d" } };
    const result = assessReproducibility(codeVersionMissing(), withCommit);
    assert.deepEqual(result.blockerTags, ["no code version"]);
    assert.equal(result.counts.known, 8);
    assert.equal(result.counts.missing, 2);
  });

  it("scores a code version the backend knows as recorded", () => {
    const known = assessReproducibility(codeVersionKnown(), clean);
    const missing = assessReproducibility(codeVersionMissing(), clean);
    assert.ok((known.score ?? 0) > (missing.score ?? 1));
  });

  it("treats uncommitted code and a missing code version as separate blockers", () => {
    const dirtyWithVersion = assessReproducibility(codeVersionKnown(), { seed: 0, environment: { dirty: true } });
    assert.deepEqual(dirtyWithVersion.blockerTags, ["uncommitted code"]);
    assert.equal(dirtyWithVersion.grade, "partial");

    const cleanWithoutVersion = assessReproducibility(codeVersionMissing(), clean);
    assert.deepEqual(cleanWithoutVersion.blockerTags, ["no code version"]);

    const both = assessReproducibility(codeVersionMissing(), { seed: 0, environment: { dirty: true } });
    assert.deepEqual(both.blockerTags, ["uncommitted code", "no code version"]);
  });

  it("scores the same as before for a generation whose commit was recorded", () => {
    // Historical semantics preserved. Before, the backend listed "Code version"
    // as missing (7 known, 2 supplied, 2 missing) and this model moved it to
    // known: (7 + 1 + 2) / (7 + 1 + 2 + 1). The backend now lists it as known
    // (8 known, 2 supplied, 1 missing), which is the same arithmetic.
    const oldScore = (7 + 1 + 2) / (7 + 1 + 2 + 1);
    const result = assessReproducibility(codeVersionKnown(), clean);
    assert.equal(result.score, oldScore);
    assert.equal(result.grade, "reproducible");
  });
});
