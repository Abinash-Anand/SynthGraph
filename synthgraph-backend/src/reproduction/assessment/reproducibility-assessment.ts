// How completely was a generation recorded?
//
// The assessment of a generation's reproduction manifest: how much of what a
// rebuild would need was captured, and what is known to stand in the way. It
// does NOT verify anything - not that the recorded values are right, that data
// still exists, or that rerunning the code would reproduce the result - which
// is why the grades describe recording, never reproducibility.
//
// This lives in the backend so every client gets the same answer (registry
// entry ARCH-003, docs/architecture/architecture-violation-registry.md). Method
// version 2 is the scoring the frontend used before it moved here: the score,
// thresholds and caps are unchanged, so existing assessments do not change.

export type AssessmentGrade = 'complete' | 'mostly' | 'partial' | 'unknown';

/** The numbers behind the score and the grades, returned with every assessment. */
export const ASSESSMENT_METHOD = {
  /** 2 = the rules below. Version 1 was the same scoring computed in the frontend, with other grade names. */
  version: 2,
  /** At or above this share of fields recorded (with no blocker) the grade is `complete`. */
  completeAt: 0.85,
  /** At or above this share it is `mostly`; below it `partial`. */
  mostlyAt: 0.6,
  /** An external field is recorded as a pointer to something SynthGraph doesn't hold. */
  externalWeight: 0.5,
} as const;

export type AssessmentMethod = typeof ASSESSMENT_METHOD;

export type ReproducibilityAssessment = {
  method: AssessmentMethod;
  grade: AssessmentGrade;
  /** 0..1 share of fields recorded, or null when there is nothing to count. */
  score: number | null;
  counts: { known: number; supplied: number; external: number; missing: number };
  /** Things that stand in the way of an exact rebuild whatever the score. */
  blockers: string[];
  /** Short labels for `blockers`, in the same order, for places that can't fit a sentence. */
  blockerTags: string[];
  notes: string[];
};

// What the assessment needs from the manifest, stated structurally so it does
// not depend on the manifest service (which depends on it).
export type AssessmentClassification = {
  known: ReadonlyArray<{ field: string }>;
  supplied: ReadonlyArray<{ field: string }>;
  external: ReadonlyArray<{ field: string }>;
  missing: readonly string[];
};

export type AssessmentReproducibility = {
  environment?: Record<string, unknown>;
};

// The manifest's own labels for these fields (see classify() in
// get-reproduction-manifest.service.ts). Whether each was recorded is the
// classification's answer, so the seed and the code version are each decided in
// exactly one place.
const SEED_FIELD = 'Seed';
const CODE_VERSION_FIELD = 'Code version';

const GRADE_ORDER: AssessmentGrade[] = ['unknown', 'partial', 'mostly', 'complete'];

function capAt(grade: AssessmentGrade, ceiling: AssessmentGrade): AssessmentGrade {
  return GRADE_ORDER.indexOf(grade) > GRADE_ORDER.indexOf(ceiling)
    ? ceiling
    : grade;
}

export function assessReproducibility(
  classification: AssessmentClassification,
  reproducibility: AssessmentReproducibility,
): ReproducibilityAssessment {
  const { missing } = classification;

  const counts = {
    known: classification.known.length,
    supplied: classification.supplied.length,
    external: classification.external.length,
    missing: missing.length,
  };
  const total =
    counts.known + counts.supplied + counts.external + counts.missing;
  // Known and supplied fields are recorded; an external one is recorded as a
  // pointer to something SynthGraph doesn't hold, so it counts for half.
  const score =
    total === 0
      ? null
      : (counts.known +
          counts.supplied +
          counts.external * ASSESSMENT_METHOD.externalWeight) /
        total;

  const blockers: string[] = [];
  const blockerTags: string[] = [];
  const notes: string[] = [];

  // A dirty working tree and a missing code version are separate facts: the
  // first is read from the environment, the second from the classification.
  const dirty = reproducibility.environment?.dirty === true;
  if (dirty) {
    blockers.push(
      "The code had uncommitted changes when this ran, so it can't be rebuilt from the recorded commit.",
    );
    blockerTags.push('uncommitted code');
  }
  if (missing.includes(SEED_FIELD)) {
    blockers.push(
      "No random seed was recorded, so the same inputs won't necessarily give the same output.",
    );
    blockerTags.push('no seed');
  }
  if (missing.includes(CODE_VERSION_FIELD)) {
    blockers.push(
      "No code version (commit) was recorded, so there's no way to know which code produced this.",
    );
    blockerTags.push('no code version');
  }
  if (counts.external > 0) {
    const names = classification.external.map((entry) => entry.field).join(', ');
    notes.push(
      `${counts.external} input${counts.external === 1 ? ' lives' : 's live'} outside SynthGraph and may have changed since: ${names}.`,
    );
  }
  if (counts.missing > 0) {
    notes.push(`Not recorded: ${missing.join(', ')}.`);
  }

  let grade: AssessmentGrade;
  if (score === null) grade = 'unknown';
  else if (score >= ASSESSMENT_METHOD.completeAt) grade = 'complete';
  else if (score >= ASSESSMENT_METHOD.mostlyAt) grade = 'mostly';
  else grade = 'partial';

  // A high field count can't outweigh a blocker: a run on dirty code is not
  // rebuildable no matter how many other fields were captured.
  if (dirty) grade = capAt(grade, 'partial');
  else if (blockers.length > 0) grade = capAt(grade, 'mostly');

  return {
    method: ASSESSMENT_METHOD,
    grade,
    score,
    counts,
    blockers,
    blockerTags,
    notes,
  };
}
