// Presenting how completely each generation was recorded.
//
// The assessment itself - the score, the grade, the blockers and the notes - is
// the backend's, returned on every reproduction manifest (registry entry
// ARCH-003, docs/architecture/architecture-violation-registry.md). This module
// only names the grades, summarises and orders assessments for display, and
// says so plainly when there is none to show. It computes no score and judges
// no blocker.
import type { ReproductionAssessment, ReproductionManifest } from "../reproduction/types/reproduction-manifest.ts";

export type ReproGrade = ReproductionAssessment["grade"];
export type AssessmentMethod = ReproductionAssessment["method"];

/** The backend's assessment, or an explicit "none" (`method: null`, grade `unknown`) with the reason as a note. */
export type ReproAssessment = Omit<ReproductionAssessment, "method"> & { method: AssessmentMethod | null };

export const GRADE_LABEL: Record<ReproGrade, string> = {
  complete: "Well recorded",
  mostly: "Some gaps",
  partial: "Major gaps",
  unknown: "Not assessed",
};

/** The same grades as a phrase after a count: "3 well recorded", "16 with major gaps". */
export const GRADE_COUNT_PHRASE: Record<ReproGrade, string> = {
  complete: "well recorded",
  mostly: "with some gaps",
  partial: "with major gaps",
  unknown: "not assessed",
};

const GRADE_ORDER: ReproGrade[] = ["unknown", "partial", "mostly", "complete"];

function notAssessed(note: string): ReproAssessment {
  return {
    method: null,
    grade: "unknown",
    score: null,
    counts: { known: 0, supplied: 0, external: 0, missing: 0 },
    blockers: [],
    blockerTags: [],
    notes: [note],
  };
}

/**
 * What to show for one generation. A manifest that did not load, or one from a
 * backend that predates the assessment, is "not assessed" with the reason; it is
 * never given a grade the backend did not return.
 */
export function assessmentFor(manifest: ReproductionManifest | null | undefined): ReproAssessment {
  if (!manifest) {
    return notAssessed("The reproduction manifest couldn't be loaded, so nothing can be said about this generation.");
  }
  if (!manifest.assessment) {
    return notAssessed(
      "This server did not return an assessment for this generation (it predates assessments), so it is not assessed here.",
    );
  }
  return manifest.assessment;
}

/** The method behind the assessments on screen, or null when none came with one. */
export function assessmentMethodOf(assessments: ReproAssessment[]): AssessmentMethod | null {
  return assessments.find((assessment) => assessment.method !== null)?.method ?? null;
}

export type ReproSummary = {
  total: number;
  byGrade: Record<ReproGrade, number>;
  /** Mean of the scores that exist, or null when none do. */
  averageScore: number | null;
};

export function summarizeReproducibility(assessments: ReproAssessment[]): ReproSummary {
  const byGrade: Record<ReproGrade, number> = { complete: 0, mostly: 0, partial: 0, unknown: 0 };
  const scores: number[] = [];
  for (const assessment of assessments) {
    byGrade[assessment.grade]++;
    if (assessment.score !== null) scores.push(assessment.score);
  }
  return {
    total: assessments.length,
    byGrade,
    averageScore: scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null,
  };
}

/** Least recorded first, so what needs fixing leads the list. */
export function compareByRisk(a: ReproAssessment, b: ReproAssessment): number {
  return GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) || (a.score ?? -1) - (b.score ?? -1);
}
