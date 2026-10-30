import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProvenanceJson, buildProvenanceMarkdown, type ProvenanceInput, reportFilename } from "./provenance-report.ts";
import { ASSESSMENT_VERSION, assessReproducibility } from "./reproducibility-model.ts";

const fields = (n: number) => Array.from({ length: n }, (_, i) => ({ field: `f${i}` }));
const clean = { seed: 1, code_version: "abc", environment: { dirty: false } };
const good = assessReproducibility({ known: fields(10), supplied: [], external: [], missing: [] }, clean);
const dirty = assessReproducibility(
  { known: fields(10), supplied: [], external: [], missing: [] },
  { ...clean, environment: { dirty: true } },
);

const base: ProvenanceInput = {
  generatedAt: "2026-10-24T10:00:00.000Z",
  experiment: { id: "e1", name: "Phase 1", description: "PPO on Go1" },
  generations: [
    {
      id: "g1", name: "variant | 01", status: "completed", generatorName: "mujoco", generatorVersion: "0.2",
      createdAt: "2026-09-24T21:00:00Z", inputCount: 0, outputCount: 1, assessment: good,
    },
    {
      id: "g2", name: "variant-02", status: "completed", generatorName: "mujoco",
      createdAt: "2026-09-24T21:05:00Z", inputCount: 0, outputCount: 0, assessment: dirty,
    },
  ],
  runs: [
    {
      id: "r1", name: "ppo-1", status: "completed", trainerName: "ppo", captureStatus: "partial",
      datasetVersions: ["v1", "v2"], evaluationCount: 3,
    },
    { id: "r2", name: "ppo-2", status: "failed", trainerName: "ppo", captureStatus: null, datasetVersions: [], evaluationCount: 0 },
  ],
};

describe("buildProvenanceMarkdown", () => {
  const md = buildProvenanceMarkdown(base);

  it("has the title, timestamp and sections", () => {
    assert.match(md, /^# Provenance report: Phase 1/);
    assert.match(md, /generated 2026-10-24T10:00:00.000Z/);
    for (const heading of ["## Summary", "## Generations", "## Training runs", "## What this report is"]) {
      assert.ok(md.includes(heading), heading);
    }
  });

  it("summarises recording completeness and capture", () => {
    assert.match(md, /1 well recorded, 0 with some gaps, 1 with major gaps, 0 not assessed/);
    assert.match(md, /Runs without complete capture: 2/);
  });

  it("does not call anything reproducible, apart from the note on what older reports called the grades", () => {
    // Regression: the report said "Reproducible" for a share of recorded fields.
    const withoutHistory = md.replace(/Reports made before version 2[\s\S]*?unchanged\./, "");
    assert.doesNotMatch(withoutHistory, /reproducible/i);
  });

  it("states the assessment version, the thresholds and the historical naming", () => {
    assert.match(md, new RegExp(`Assessment version ${ASSESSMENT_VERSION}`));
    assert.match(md, /85% or more, with nothing blocking, a generation is "well recorded"/);
    assert.match(md, /60% or more it has "some gaps"/);
    assert.match(md, /Reports made before version 2 called these grades reproducible/);
  });

  it("escapes pipes so a name can't break its table cell", () => {
    assert.ok(md.includes("variant \\| 01"));
  });

  it("lists blockers for the dirty generation", () => {
    assert.match(md, /### Issues/);
    assert.match(md, /Blocker: The code had uncommitted changes/);
  });

  it("describes unlinked and unreported runs plainly", () => {
    assert.match(md, /not reported/);
    assert.match(md, /none linked/);
    assert.match(md, /v1, v2/);
  });

  it("states that it verifies nothing", () => {
    assert.match(md, /does not verify that the recorded values are correct/);
  });

  it("is deterministic", () => {
    assert.equal(buildProvenanceMarkdown(base), md);
  });
});

describe("buildProvenanceMarkdown - empty", () => {
  it("handles an experiment with nothing in it", () => {
    const md = buildProvenanceMarkdown({ ...base, generations: [], runs: [] });
    assert.equal((md.match(/None recorded\./g) ?? []).length, 2);
  });
});

describe("reportFilename", () => {
  it("slugifies the name and falls back when it's empty", () => {
    assert.equal(reportFilename("Phase 1 - Domain-Randomized!", "md"), "phase-1-domain-randomized-provenance.md");
    assert.equal(reportFilename("???", "json"), "experiment-provenance.json");
  });
});

describe("buildProvenanceJson", () => {
  const parsed = JSON.parse(buildProvenanceJson(base));

  it("says which assessment rules produced it", () => {
    assert.equal(parsed.assessmentVersion, ASSESSMENT_VERSION);
    assert.deepEqual(parsed.assessmentMethod, { completeAt: 0.85, mostlyAt: 0.6, externalWeight: 0.5 });
  });

  it("carries the report content unchanged", () => {
    assert.equal(parsed.experiment.id, "e1");
    assert.equal(parsed.generations[0].assessment.grade, "complete");
    assert.equal(parsed.generations[1].assessment.grade, "partial");
  });
});
