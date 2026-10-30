import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ExperimentRepository } from '../../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../../experiments/repositories/experiment.tokens.js';
import type { GenerationRepository } from '../../generations/repositories/generation.repository.js';
import { GENERATION_REPOSITORY } from '../../generations/repositories/generation.tokens.js';

import type { ReproductionRepository } from '../repositories/reproduction.repository.js';
import { REPRODUCTION_REPOSITORY } from '../repositories/reproduction.repository.token.js';

import {
  buildReproductionManifest,
  type DatasetReferenceSummary,
} from './get-reproduction-manifest.service.js';

/**
 * Every generation's manifest for one experiment in a single request.
 *
 * The workspace needs all of them at once, and asking per generation cost one
 * request (and one rate-limit token) each - 16 for a modest experiment, each
 * its own chance of being refused. Same ordering and pagination as
 * `GET /experiments/:id/generations`, so the two line up one-to-one.
 */
@Injectable()
export class ListReproductionManifestsService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(GENERATION_REPOSITORY)
    private readonly generationRepository: GenerationRepository,

    @Inject(REPRODUCTION_REPOSITORY)
    private readonly reproductionRepository: ReproductionRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    limit: number,
    offset: number,
  ) {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    const generations =
      await this.generationRepository.findAllForExperiment(
        experiment.id,
        limit,
        offset,
      );

    const references =
      await this.reproductionRepository.findDatasetReferencesForGenerations(
        generations.map((generation) => generation.id),
      );

    const referencesByGeneration = new Map<string, DatasetReferenceSummary[]>();
    for (const reference of references) {
      const list = referencesByGeneration.get(reference.generationId) ?? [];
      list.push({
        datasetVersionId: reference.datasetVersionId,
        role: reference.role,
      });
      referencesByGeneration.set(reference.generationId, list);
    }

    return generations.map((generation) =>
      buildReproductionManifest(
        generation,
        referencesByGeneration.get(generation.id) ?? [],
      ),
    );
  }
}
