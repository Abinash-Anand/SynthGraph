// How completely was a generation recorded?
//
// Deliberately modest. It reads the backend's own classification of the
// generation's fields (known / supplied / external / missing) and the
// recorded reproducibility block, and says how much of what a rebuild would
// need was captured and what is known to stand in the way. It does NOT verify
// anything - in particular it doesn't check that the values are right, or that
// data still exists or matches a checksum - and it is not a statement that the
// result can be reproduced, so the wording is "recorded", never "reproducible"
// or "verified".
//
// Scoring and grading still live in the frontend (registry entry ARCH-003);
// ASSESSMENT_VERSION says which rules produced a result.

export type ClassifiedFieldLike = { field: string; value?: string };

export type ClassificationLike = {
  known: ClassifiedFieldLike[];
  supplied: ClassifiedFieldLike[];
  external: ClassifiedFieldLike[];
  missing: string[];
};

export type ReproducibilityLike = {
  seed?: number;
  code_version?: string;
  environment?: Record<string, unknown>;
};

/**
 * Which rules produced an assessment, so a stored or downloaded result can be
 * read against the right method.
 *
 * 1 - grades were named reproducible / mostly reproducible / partly reproducible
 *     (key `reproducible` for the top grade), and this model recovered the code
 *     version from `environment.commit` itself.
 * 2 - the same score, thresholds and caps; the top grade's key is `complete` and
 *     the grades are named for what they measure, how completely the generation
 *     was recorded; the code version is read from the backend's classification
 *     (classification version 2), which now counts `environment.commit`.
 */
export const ASSESSMENT_VERSION = 2;

/** The numbers behind the score and the grades, so reports can state them. */
export const ASSESSMENT_METHOD = {
  /** At or above this share of fields recorded (with no blocker) the grade is `complete`. */
  completeAt: 0.85,
  /** At or above this share it is `mostly`; below it `partial`. */
  mostlyAt: 0.6,
  /** An external field is recorded as a pointer to something SynthGraph doesn't hold. */
  externalWeight: 0.5,
} as const;

export type ReproGrade = "complete" | "mostly" | "partial" | "unknown";

export type ReproAssessment = {
  grade: ReproGrade;
  /** 0..1 share of fields recorded, or null with no manifest. */
  score: number | null;
  counts: { known: number; supplied: number; external: number; missing: number };
  /** Things that stop an exact rebuild regardless of the score. */
  blockers: string[];
  /** Short labels for `blockers`, for places that can't fit a sentence (e.g. a chip). */
  blockerTags: string[];
  notes: string[];
};

// The backend's own label for the field (see get-reproduction-manifest.service.ts).
// Whether a code version was recorded is the backend's call: it counts an
// explicit `code_version` and the commit the SDK records under
// `environment.commit` (classification version 2). This model reads that
// classification and does not second-guess it.
const CODE_VERSION_FIELD = "Code version";

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

function capAt(grade: ReproGrade, ceiling: ReproGrade): ReproGrade {
  return GRADE_ORDER.indexOf(grade) > GRADE_ORDER.indexOf(ceiling) ? ceiling : grade;
}

export function assessReproducibility(
  classification: ClassificationLike | null | undefined,
  reproducibility: ReproducibilityLike | null | undefined,
): ReproAssessment {
  if (!classification) {
    return {
      grade: "unknown",
      score: null,
      counts: { known: 0, supplied: 0, external: 0, missing: 0 },
      blockers: [],
      blockerTags: [],
      notes: ["The reproduction manifest couldn't be loaded, so nothing can be said about this generation."],
    };
  }

  const environment = reproducibility?.environment;

  // Commit presence and a dirty working tree are separate facts. Whether a
  // version was recorded comes from the backend's classification; whether the
  // tree was dirty (below) is read from the environment and blocks on its own.
  const missing = classification.missing;
  const hasCodeVersion = !missing.includes(CODE_VERSION_FIELD);

  const counts = {
    known: classification.known.length,
    supplied: classification.supplied.length,
    external: classification.external.length,
    missing: missing.length,
  };
  const total = counts.known + counts.supplied + counts.external + counts.missing;
  // Known and supplied fields are recorded; an external one is recorded as a
  // pointer to something SynthGraph doesn't hold, so it counts for half.
  const score =
    total === 0
      ? null
      : (counts.known + counts.supplied + counts.external * ASSESSMENT_METHOD.externalWeight) / total;

  const blockers: string[] = [];
  const blockerTags: string[] = [];
  const notes: string[] = [];

  const dirty = environment?.dirty === true;
  if (dirty) {
    blockers.push("The code had uncommitted changes when this ran, so it can't be rebuilt from the recorded commit.");
    blockerTags.push("uncommitted code");
  }
  if (reproducibility?.seed === undefined || reproducibility.seed === null) {
    blockers.push("No random seed was recorded, so the same inputs won't necessarily give the same output.");
    blockerTags.push("no seed");
  }
  if (!hasCodeVersion) {
    blockers.push("No code version (commit) was recorded, so there's no way to know which code produced this.");
    blockerTags.push("no code version");
  }
  if (counts.external > 0) {
    notes.push(
      `${counts.external} input${counts.external === 1 ? " lives" : "s live"} outside SynthGraph and may have changed since: ${classification.external
        .map((f) => f.field)
        .join(", ")}.`,
    );
  }
  if (counts.missing > 0) {
    notes.push(`Not recorded: ${missing.join(", ")}.`);
  }

  let grade: ReproGrade;
  if (score === null) grade = "unknown";
  else if (score >= ASSESSMENT_METHOD.completeAt) grade = "complete";
  else if (score >= ASSESSMENT_METHOD.mostlyAt) grade = "mostly";
  else grade = "partial";

  // A high field count can't outweigh a blocker: a run on dirty code is not
  // rebuildable no matter how many other fields were captured.
  if (dirty) grade = capAt(grade, "partial");
  else if (blockers.length > 0) grade = capAt(grade, "mostly");

  return { grade, score, counts, blockers, blockerTags, notes };
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

/** Worst first, so what needs fixing leads the list. */
export function compareByRisk(a: ReproAssessment, b: ReproAssessment): number {
  return GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) || (a.score ?? -1) - (b.score ?? -1);
}
