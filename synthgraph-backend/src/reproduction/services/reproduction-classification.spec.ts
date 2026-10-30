import {
  buildReproductionManifest,
  CLASSIFICATION_VERSION,
} from './get-reproduction-manifest.service.js';

const generation = (reproducibility: Record<string, unknown>) =>
  ({
    id: 'generation-1',
    experimentId: 'experiment-1',
    name: 'generation',
    description: null,
    generator: { name: 'mujoco_playground', version: '0.2.0' },
    parameters: {},
    reproducibility,
    status: 'completed',
    inputs: [],
    outputs: [],
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    startedAt: null,
    completedAt: null,
  }) as never;

const classify = (reproducibility: Record<string, unknown>) =>
  buildReproductionManifest(generation(reproducibility), []).classification;

const codeVersion = (reproducibility: Record<string, unknown>) => {
  const { known, missing } = classify(reproducibility);
  return {
    known: known.find((entry) => entry.field === 'Code version')?.value,
    missing: missing.includes('Code version'),
  };
};

describe('reproduction classification: code version', () => {
  it('lists a code version as missing when neither a version nor a commit was recorded', () => {
    expect(codeVersion({ seed: 1 })).toEqual({ known: undefined, missing: true });
    expect(codeVersion({ seed: 1, environment: { os: 'Windows' } })).toEqual({
      known: undefined,
      missing: true,
    });
  });

  it('knows the code version from the commit the SDK records in the environment', () => {
    // Regression: only `code_version` counted, so a recorded commit was listed
    // as a missing code version and the frontend had to patch it back.
    expect(
      codeVersion({ seed: 1, environment: { commit: 'a1b2c3d', os: 'Linux' } }),
    ).toEqual({ known: 'a1b2c3d', missing: false });
  });

  it('prefers an explicit code_version over the environment commit, without listing it twice', () => {
    const { known } = classify({
      code_version: 'v1.4.0',
      environment: { commit: 'a1b2c3d' },
    });

    expect(known.filter((entry) => entry.field === 'Code version')).toEqual([
      { field: 'Code version', value: 'v1.4.0' },
    ]);
  });

  it.each([
    ['blank', ''],
    ['whitespace', '   '],
    ['a number', 12345],
    ['null', null],
    ['an object', { sha: 'a1b2c3d' }],
  ])('does not accept %s as a recorded commit', (_label, commit) => {
    expect(codeVersion({ seed: 1, environment: { commit } })).toEqual({
      known: undefined,
      missing: true,
    });
  });

  it('treats a commit and a dirty working tree as separate facts', () => {
    // A dirty tree does not erase the recorded commit, and recording that the
    // tree was dirty does not stand in for a commit.
    expect(
      codeVersion({ environment: { commit: 'a1b2c3d', dirty: true } }),
    ).toEqual({ known: 'a1b2c3d', missing: false });
    expect(codeVersion({ environment: { dirty: true } })).toEqual({
      known: undefined,
      missing: true,
    });
    expect(codeVersion({ environment: { commit: 'a1b2c3d', dirty: false } })).toEqual({
      known: 'a1b2c3d',
      missing: false,
    });
  });

  it('keeps reporting every environment key, including the commit, as supplied', () => {
    // Preserved on purpose: the completeness score counts supplied fields, and
    // changing what is supplied would change historical scores.
    const { supplied } = classify({
      environment: { commit: 'a1b2c3d', dirty: true, python_version: '3.12.10' },
    });

    expect(supplied).toEqual([
      { field: 'commit', value: 'a1b2c3d' },
      { field: 'dirty', value: 'true' },
      { field: 'python_version', value: '3.12.10' },
    ]);
  });

  it('leaves every other classification untouched', () => {
    expect(classify({ seed: 7, configuration_hash: 'abc', environment: { os: 'Linux' } })).toEqual({
      known: [
        { field: 'Generator', value: 'mujoco_playground' },
        { field: 'Generator version', value: '0.2.0' },
        { field: 'Seed', value: '7' },
        { field: 'Configuration hash', value: 'abc' },
      ],
      supplied: [{ field: 'os', value: 'Linux' }],
      missing: ['Code version'],
      external: [],
    });
  });
});

describe('reproduction classification: version', () => {
  it('states which rules the classification used', () => {
    const manifest = buildReproductionManifest(generation({ seed: 1 }), []);

    expect(CLASSIFICATION_VERSION).toBe(2);
    expect(manifest.classificationVersion).toBe(CLASSIFICATION_VERSION);
  });
});
