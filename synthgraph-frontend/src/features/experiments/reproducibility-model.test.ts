import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as model from "./reproducibility-model.ts";
import {
  assessmentFor,
  assessmentMethodOf,
  compareByRisk,
  GRADE_COUNT_PHRASE,
  GRADE_LABEL,
  type ReproAssessment,
  type ReproGrade,
  summarizeReproducibility,
} from "./reproducibility-model.ts";
import type { ReproductionAssessment, ReproductionManifest } from "../reproduction/types/reproduction-manifest.ts";

const METHOD = { version: 2, completeAt: 0.85, mostlyAt: 0.6, externalWeight: 0.5 };

const assessment = (grade: ReproGrade, score: number | null, blockerTags: string[] = []): ReproductionAssessment => ({
  method: METHOD,
  grade,
  score,
  counts: { known: 0, supplied: 0, external: 0, missing: 0 },
  blockers: blockerTags.map((tag) => `blocker: ${tag}`),
  blockerTags,
  notes: [],
});

const manifest = (withAssessment: ReproductionAssessment | undefined): ReproductionManifest =>
  ({
    schemaVersion: "1.0",
    // A classification that WOULD score well: the model must not grade from it.
    classification: { known: [{ field: "Generator", value: "x" }], supplied: [], missing: [], external: [] },
    assessment: withAssessment,
    generation: {},
    datasetReferences: [],
  }) as unknown as ReproductionManifest;

describe("assessmentFor", () => {
  it("shows the backend's assessment as it is", () => {
    const backend = assessment("mostly", 0.7, ["no seed"]);
    assert.equal(assessmentFor(manifest(backend)), backend);
  });

  it("is not assessed, with the reason, when the manifest did not load", () => {
    const result = assessmentFor(null);
    assert.equal(result.grade, "unknown");
    assert.equal(result.score, null);
    assert.equal(result.method, null);
    assert.match(result.notes[0], /couldn't be loaded/);
  });

  it("is not assessed when the backend predates assessments, and does not grade the fields itself", () => {
    // Regression guard for ARCH-003: scoring moved to the backend. A manifest
    // that has fields but no assessment must not be graded here.
    const result = assessmentFor(manifest(undefined));
    assert.equal(result.grade, "unknown");
    assert.equal(result.score, null);
    assert.match(result.notes[0], /did not return an assessment/);
  });
});

describe("the model computes nothing", () => {
  it("exports no scoring function or constants", () => {
    // The score, thresholds and blockers are the backend's.
    const exported = Object.keys(model);
    for (const name of ["assessReproducibility", "missingFields", "ASSESSMENT_METHOD", "ASSESSMENT_VERSION"]) {
      assert.equal(exported.includes(name), false, name);
    }
  });
});

describe("assessmentMethodOf", () => {
  it("returns the method the backend stated, and null when none did", () => {
    const withMethod = assessmentFor(manifest(assessment("complete", 1)));
    const without = assessmentFor(null);
    assert.deepEqual(assessmentMethodOf([without, withMethod]), METHOD);
    assert.equal(assessmentMethodOf([without]), null);
    assert.equal(assessmentMethodOf([]), null);
  });
});

describe("summarizeReproducibility", () => {
  it("counts grades and averages the scores that exist", () => {
    const summary = summarizeReproducibility([
      assessment("complete", 1),
      assessment("partial", 0.5),
      assessmentFor(null) as ReproAssessment,
    ]);
    assert.equal(summary.total, 3);
    assert.deepEqual(summary.byGrade, { complete: 1, mostly: 0, partial: 1, unknown: 1 });
    assert.equal(summary.averageScore, 0.75);
  });

  it("has no average with no scores", () => {
    assert.equal(summarizeReproducibility([]).averageScore, null);
  });
});

describe("compareByRisk", () => {
  it("sorts the least recorded first, then by score", () => {
    const good = assessment("complete", 1);
    const weak = assessment("partial", 0.3);
    const weaker = assessment("partial", 0.1);
    const none = assessmentFor(null);
    assert.deepEqual(
      [good, weak, none, weaker].sort(compareByRisk).map((a) => [a.grade, a.score]),
      [
        ["unknown", null],
        ["partial", 0.1],
        ["partial", 0.3],
        ["complete", 1],
      ],
    );
  });
});

describe("grade names", () => {
  it("name the grades for what they measure, never for reproducibility", () => {
    // Regression: the top grade was labelled "Reproducible", which claims more
    // than a share of recorded fields can show.
    const everything = [...Object.values(GRADE_LABEL), ...Object.values(GRADE_COUNT_PHRASE)].join(" ");
    assert.doesNotMatch(everything, /reproduc/i);
    assert.deepEqual(GRADE_LABEL, {
      complete: "Well recorded",
      mostly: "Some gaps",
      partial: "Major gaps",
      unknown: "Not assessed",
    });
  });

  it("complete a count phrase", () => {
    assert.equal(`16 ${GRADE_COUNT_PHRASE.partial}`, "16 with major gaps");
    assert.equal(`3 ${GRADE_COUNT_PHRASE.complete}`, "3 well recorded");
  });
});
