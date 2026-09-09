import { Injectable, NotFoundException } from '@nestjs/common';

import {
  Generation,
  GenerationStatus,
} from '../../database/entities/generation.entity.js';
import { TypeOrmExperimentRepository } from '../../experiments/repositories/typeorm-experiment.repository.js';
import { CreateGenerationRequest } from '../dto/generation-request.dto.js';
import { TypeOrmGenerationRepository } from '../repositories/typeorm-generation.repository.js';

@Injectable()
export class CreateGenerationService {
  constructor(
    private readonly generationRepository: TypeOrmGenerationRepository,
    private readonly experimentRepository: TypeOrmExperimentRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    input: CreateGenerationRequest,
  ): Promise<Generation> {
    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    const generation = new Generation();
    generation.experimentId = experiment.id;
    generation.name = input.name;
    generation.description = null;
    generation.generator = input.generator;
    generation.parameters = input.parameters;
    generation.reproducibility = input.reproducibility;
    generation.inputs = input.inputs;
    generation.outputs = input.outputs;
    generation.status = GenerationStatus.Pending;
    generation.startedAt = null;
    generation.completedAt = null;
    generation.metadata = {};

    return this.generationRepository.create(generation);
  }
}
