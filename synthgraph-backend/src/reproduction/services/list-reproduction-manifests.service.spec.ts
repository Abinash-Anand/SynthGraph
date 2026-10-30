import { NotFoundException } from '@nestjs/common';

import { GenerationStatus } from '../../database/entities/generation.entity.js';
import { ListReproductionManifestsService } from './list-reproduction-manifests.service.js';

const generation = (id: string, overrides: Record<string, unknown> = {}) =>
  ({
    id,
    experimentId: 'experiment-1',
    name: `generation-${id}`,
    description: null,
    generator: { name: 'blender', version: '4.2' },
    parameters: { lighting: 'rain' },
    reproducibility: { seed: 1, code_version: 'abc', environment: { python: '3.12' } },
    status: GenerationStatus.Completed,
    inputs: [],
    outputs: [],
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    startedAt: null,
    completedAt: null,
    ...overrides,
  }) as never;

describe('ListReproductionManifestsService', () => {
  const experimentRepository = { findByIdForUser: vi.fn() };
  const generationRepository = { findAllForExperiment: vi.fn() };
  const reproductionRepository = { findDatasetReferencesForGenerations: vi.fn() };

  let service: ListReproductionManifestsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ListReproductionManifestsService(
      experimentRepository as never,
      generationRepository as never,
      reproductionRepository as never,
    );
  });

  it('returns one manifest per generation, in order, with only that generation\'s dataset references', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    generationRepository.findAllForExperiment.mockResolvedValue([generation('g1'), generation('g2')]);
    reproductionRepository.findDatasetReferencesForGenerations.mockResolvedValue([
      { generationId: 'g2', datasetVersionId: 'dv-2', role: 'output' },
      { generationId: 'g1', datasetVersionId: 'dv-1', role: 'input' },
      { generationId: 'g1', datasetVersionId: 'dv-3', role: 'output' },
    ]);

    const manifests = await service.execute('experiment-1', 'user-1', 100, 0);

    expect(manifests.map((m) => m.generation.id)).toEqual(['g1', 'g2']);
    expect(manifests[0].datasetReferences).toEqual([
      { datasetVersionId: 'dv-1', role: 'input' },
      { datasetVersionId: 'dv-3', role: 'output' },
    ]);
    expect(manifests[1].datasetReferences).toEqual([{ datasetVersionId: 'dv-2', role: 'output' }]);
    expect(manifests[0].classification.external).toEqual([
      { field: 'input', value: 'dv-1' },
      { field: 'output', value: 'dv-3' },
    ]);
    // One query for every generation's references, not one per generation.
    expect(reproductionRepository.findDatasetReferencesForGenerations).toHaveBeenCalledTimes(1);
    expect(reproductionRepository.findDatasetReferencesForGenerations).toHaveBeenCalledWith(['g1', 'g2']);
  });

  it('passes the pagination through to the generation list', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    generationRepository.findAllForExperiment.mockResolvedValue([]);
    reproductionRepository.findDatasetReferencesForGenerations.mockResolvedValue([]);

    expect(await service.execute('experiment-1', 'user-1', 25, 50)).toEqual([]);
    expect(generationRepository.findAllForExperiment).toHaveBeenCalledWith('experiment-1', 25, 50);
  });

  it('is a 404 for an experiment the user does not own, and reads nothing else', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue(null);

    await expect(service.execute('experiment-1', 'someone-else', 100, 0)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(generationRepository.findAllForExperiment).not.toHaveBeenCalled();
    expect(reproductionRepository.findDatasetReferencesForGenerations).not.toHaveBeenCalled();
  });

  it('builds the same manifest document the single-generation route does', async () => {
    experimentRepository.findByIdForUser.mockResolvedValue({ id: 'experiment-1' });
    generationRepository.findAllForExperiment.mockResolvedValue([generation('g1')]);
    reproductionRepository.findDatasetReferencesForGenerations.mockResolvedValue([]);

    const [manifest] = await service.execute('experiment-1', 'user-1', 100, 0);

    expect(Object.keys(manifest).sort()).toEqual(
      [
        'assessment',
        'classification',
        'classificationVersion',
        'datasetReferences',
        'generation',
        'normalized',
        'schemaVersion',
      ],
    );
    expect(manifest.classification.missing).toEqual(['Configuration hash']);
  });
});
