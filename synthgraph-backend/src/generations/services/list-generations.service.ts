import { Injectable, NotFoundException } from '@nestjs/common';

import { Generation } from '../../database/entities/generation.entity.js';
import { TypeOrmExperimentRepository } from '../../experiments/repositories/typeorm-experiment.repository.js';
import { TypeOrmGenerationRepository } from '../repositories/typeorm-generation.repository.js';

@Injectable()
export class ListGenerationsService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,
    private readonly experimentRepository: TypeOrmExperimentRepository,
  ) {}

  async execute(experimentId: string, userId: string): Promise<Generation[]> {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    return this.generationRepository.findAllForExperiment(experiment.id);
  }
}
