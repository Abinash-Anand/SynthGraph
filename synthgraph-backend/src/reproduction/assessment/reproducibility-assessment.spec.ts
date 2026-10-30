import {
  ASSESSMENT_METHOD,
  assessReproducibility,
  type AssessmentClassification,
} from './reproducibility-assessment.js';

const fields = (count: number, prefix = 'f') =>
  Array.from({ length: count }, (_, index) => ({ field: `${prefix}${index}` }));

const classification = (
  known: number,
  supplied = 0,
  external = 0,
  missing: string[] = [],
): AssessmentClassification => ({
  known: fields(known),
  supplied: fields(supplied),
  external: fields(external, 'external'),
  missing,
});

const clean = { environment: { dirty: false } };

describe('assessReproducibility: score and grade', () => {
  it('is complete when nearly everything is recorded and nothing blocks', () => {
    const result = assessReproducibility(classification(9, 1), clean);

    expect(result.grade).toBe('complete');
    expect(result.score).toBe(1);
    expect(result.blockers).toEqual([]);
    expect(result.blockerTags).toEqual([]);
  });

  it('scores external fields at half', () => {
    const result = assessReproducibility(classification(2, 0, 2), clean);

    expect(result.score).toBe(0.75);
    expect(result.grade).toBe('mostly');
    expect(result.notes[0]).toMatch(/2 inputs live outside SynthGraph/);
  });

  it('grades exactly at the documented thresholds', () => {
    const missing = (count: number) =>
      Array.from({ length: count }, (_, index) => `m${index}`);

    // 17 of 20 = 85%: complete. 16 of 20 = 80%: mostly.
    expect(assessReproducibility(classification(17, 0, 0, missing(3)), clean).grade).toBe('complete');
    expect(assessReproducibility(classification(16, 0, 0, missing(4)), clean).grade).toBe('mostly');
    // 3 of 5 = 60%: mostly. 5 of 9: just under 60%: partial.
    expect(assessReproducibility(classification(3, 0, 0, missing(2)), clean).grade).toBe('mostly');
    expect(assessReproducibility(classification(5, 0, 0, missing(4)), clean).grade).toBe('partial');
  });

  it('is unknown when there is nothing to count', () => {
    const result = assessReproducibility(classification(0), clean);

    expect(result.grade).toBe('unknown');
    expect(result.score).toBeNull();
  });

  it('counts every classified field', () => {
    const result = assessReproducibility(classification(3, 2, 1, ['a', 'b']), clean);

    expect(result.counts).toEqual({ known: 3, supplied: 2, external: 1, missing: 2 });
  });
});

describe('assessReproducibility: blockers', () => {
  it('caps a perfect score at partial when the code was dirty', () => {
    const result = assessReproducibility(classification(10), {
      environment: { dirty: true },
    });

    expect(result.score).toBe(1);
    expect(result.grade).toBe('partial');
    expect(result.blockers[0]).toMatch(/uncommitted changes/);
    expect(result.blockerTags).toEqual(['uncommitted code']);
  });

  it('caps at mostly when the seed or the code version is missing', () => {
    const noSeed = assessReproducibility({ ...classification(9), missing: ['Seed'] }, clean);
    const noCodeVersion = assessReproducibility(
      { ...classification(9), missing: ['Code version'] },
      clean,
    );

    expect(noSeed.grade).toBe('mostly');
    expect(noSeed.blockerTags).toEqual(['no seed']);
    expect(noCodeVersion.grade).toBe('mostly');
    expect(noCodeVersion.blockerTags).toEqual(['no code version']);
  });

  it('reports every blocker, in a stable order', () => {
    const result = assessReproducibility(
      { ...classification(8), missing: ['Seed', 'Code version'] },
      { environment: { dirty: true } },
    );

    expect(result.blockerTags).toEqual(['uncommitted code', 'no seed', 'no code version']);
    expect(result.blockers).toHaveLength(result.blockerTags.length);
  });

  it('treats a dirty working tree and a missing code version as separate facts', () => {
    // A known code version does not hide a dirty tree, and a clean tree does not
    // hide a missing version.
    const dirtyWithVersion = assessReproducibility(classification(10), {
      environment: { dirty: true },
    });
    const cleanWithoutVersion = assessReproducibility(
      { ...classification(9), missing: ['Code version'] },
      { environment: { dirty: false } },
    );

    expect(dirtyWithVersion.blockerTags).toEqual(['uncommitted code']);
    expect(cleanWithoutVersion.blockerTags).toEqual(['no code version']);
  });

  it('does not read dirty from anything but an explicit true', () => {
    for (const dirty of [false, 'true', 1, null, undefined]) {
      expect(
        assessReproducibility(classification(10), { environment: { dirty } }).blockerTags,
      ).toEqual([]);
    }
    expect(assessReproducibility(classification(10), {}).blockerTags).toEqual([]);
  });

  it('takes the seed and the code version from the classification, not from the raw fields', () => {
    // Each fact has one definition: whether it was recorded is the
    // classification's answer, so the assessment cannot disagree with it.
    const result = assessReproducibility(
      classification(10),
      { environment: { commit: undefined, seed: undefined } } as never,
    );

    expect(result.blockerTags).toEqual([]);
  });
});

describe('assessReproducibility: notes', () => {
  it('lists what is not recorded', () => {
    const result = assessReproducibility(
      classification(1, 0, 0, ['Configuration hash', 'Environment']),
      clean,
    );

    expect(result.notes).toEqual(['Not recorded: Configuration hash, Environment.']);
  });

  it('names external inputs and uses the singular for one', () => {
    const result = assessReproducibility(classification(5, 0, 1), clean);

    expect(result.notes).toEqual([
      '1 input lives outside SynthGraph and may have changed since: external0.',
    ]);
  });
});

describe('assessReproducibility: method', () => {
  it('states the rules that produced it', () => {
    const result = assessReproducibility(classification(10), clean);

    expect(result.method).toEqual({
      version: 2,
      completeAt: 0.85,
      mostlyAt: 0.6,
      externalWeight: 0.5,
    });
    expect(result.method).toBe(ASSESSMENT_METHOD);
  });

  it('scores a Phase-1-shaped generation at 82%', () => {
    // 3 known (generator, version, seed) + 6 environment keys supplied, with the
    // code version and configuration hash missing: 9 of 11 recorded.
    const result = assessReproducibility(
      classification(3, 6, 0, ['Code version', 'Configuration hash']),
      { environment: { dirty: true } },
    );

    expect(Math.round((result.score ?? 0) * 100)).toBe(82);
    expect(result.grade).toBe('partial');
    expect(result.blockerTags).toEqual(['uncommitted code', 'no code version']);
  });
});
