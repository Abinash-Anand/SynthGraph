import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Generation } from '../../database/entities/generation.entity.js';
import { TypeOrmExperimentRepository } from '../../experiments/repositories/typeorm-experiment.repository.js';
import { TypeOrmGenerationRepository } from '../repositories/typeorm-generation.repository.js';

@Injectable()
export class ListGenerationsService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,
    private readonly experimentRepository: TypeOrmExperimentRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    parameters?: string,
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
    );
  }
}