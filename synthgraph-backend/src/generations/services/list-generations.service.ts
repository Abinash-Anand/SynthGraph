import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Generation } from '../../database/entities/generation.entity.js';
import type { ExperimentRepository } from '../../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../../experiments/repositories/experiment.tokens.js';
import type { GenerationRepository } from '../repositories/generation.repository.js';
import { GENERATION_REPOSITORY } from '../repositories/generation.tokens.js';

@Injectable()
export class ListGenerationsService {
  constructor(
    @Inject(GENERATION_REPOSITORY)
    private readonly generationRepository: GenerationRepository,

    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    parameters: string | undefined,
    limit: number,
    offset: number,
  ): Promise<Generation[]> {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    if (parameters === undefined) {
      return this.generationRepository.findAllForExperiment(
        experiment.id,
        limit,
        offset,
      );
    }

    let parsedParameters: unknown;

    try {
      parsedParameters = JSON.parse(parameters);
    } catch {
      throw new BadRequestException(
        'parameters must contain valid JSON',
      );
    }

    if (
      parsedParameters === null ||
      typeof parsedParameters !== 'object' ||
      Array.isArray(parsedParameters)
    ) {
      throw new BadRequestException(
        'parameters must be a JSON object',
      );
    }

    return this.generationRepository.findByParameters(
      experiment.id,
      parsedParameters as Record<string, unknown>,
      limit,
      offset,
    );
  }
}