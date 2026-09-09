import { NotFoundException } from '@nestjs/common';

import {
  GenerationStatus,
  type Generation,
} from '../../database/entities/generation.entity.js';
import type { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';
import type { ReproductionRepository } from '../repositories/reproduction.repository.js';
import { GetReproductionManifestService } from './get-reproduction-manifest.service.js';

describe('GetReproductionManifestService', () => {
  const generationRepository = {
    findByIdForUser: vi.fn(),
  };

  const reproductionRepository: {
    findDatasetReferences: ReturnType<typeof vi.fn>;
  } = {
    findDatasetReferences: vi.fn(),
  };

  let service: GetReproductionManifestService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new GetReproductionManifestService(
      generationRepository as never,
      reproductionRepository as ReproductionRepository,
    );
  });

  it('returns a reproduction manifest for an owned generation', async () => {
    const generation = {
      id: 'generation-1',
      experimentId: 'experiment-1',
      name: 'Rainy Scene Generation',
      description: 'Synthetic rainy driving scenes',
      generator: {
        name: 'blender',
        version: '4.2',
        type: 'renderer',
      },
      parameters: {
        lighting: 'rain',
        occlusion: 0.3,
      },
      reproducibility: {
        seed: 42,
        code_version: 'abc123',
        environment: {
          python: '3.12',
        },
        configuration_hash: 'config-hash',
      },
      status: GenerationStatus.Completed,
      inputs: [
        {
          id: 'input-1',
          uri: 's3://example/input',
          type: 'dataset',
        },
      ],
      outputs: [
        {
          id: 'output-1',
          uri: 's3://example/output',
          type: 'dataset',
        },
      ],
    } as Generation;

    const datasetReferences = [
      {
        id: 'reference-1',
        generationId: generation.id,
        datasetVersionId: 'dataset-version-1',
        role: 'input',
      },
      {
        id: 'reference-2',
        generationId: generation.id,
        datasetVersionId: 'dataset-version-2',
        role: 'output',
      },
    ] as GenerationDatasetReference[];

    generationRepository.findByIdForUser.mockResolvedValue(generation);
    reproductionRepository.findDatasetReferences.mockResolvedValue(
      datasetReferences,
    );

    const result = await service.execute(
      generation.id,
      'user-1',
    );

    expect(result).toEqual({
      schemaVersion: '1.0',
      generation: {
        id: generation.id,
        experimentId: generation.experimentId,
        name: generation.name,
        description: generation.description,
        generator: generation.generator,
        parameters: generation.parameters,
        reproducibility: generation.reproducibility,
        status: generation.status,
        inputs: generation.inputs,
        outputs: generation.outputs,
      },
      datasetReferences: [
        {
          datasetVersionId: 'dataset-version-1',
          role: 'input',
        },
        {
          datasetVersionId: 'dataset-version-2',
          role: 'output',
        },
      ],
    });

    expect(
      generationRepository.findByIdForUser,
    ).toHaveBeenCalledWith(
      generation.id,
      'user-1',
    );

    expect(
      reproductionRepository.findDatasetReferences,
    ).toHaveBeenCalledWith(generation.id);
  });

  it('throws NotFoundException when the generation is not owned by the user', async () => {
    generationRepository.findByIdForUser.mockResolvedValue(null);

    await expect(
      service.execute('generation-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      reproductionRepository.findDatasetReferences,
    ).not.toHaveBeenCalled();
  });

  it('returns an empty dataset reference list when no datasets are attached', async () => {
    const generation = {
      id: 'generation-1',
      experimentId: 'experiment-1',
      name: 'Generation Without Dataset',
      description: null,
      generator: {
        name: 'blender',
      },
      parameters: {},
      reproducibility: {
        seed: 42,
      },
      status: GenerationStatus.Completed,
      inputs: [],
      outputs: [],
    } as Generation;

    generationRepository.findByIdForUser.mockResolvedValue(generation);
    reproductionRepository.findDatasetReferences.mockResolvedValue([]);

    const result = await service.execute(
      generation.id,
      'user-1',
    );

    expect(result.datasetReferences).toEqual([]);
  });
});