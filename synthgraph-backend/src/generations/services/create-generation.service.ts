import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  Generation,
  GenerationStatus,
} from '../../database/entities/generation.entity.js';
import type { ExperimentRepository } from '../../experiments/repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../../experiments/repositories/experiment.tokens.js';
import { CreateGenerationRequest } from '../dto/generation-request.dto.js';
import type { GenerationRepository } from '../repositories/generation.repository.js';
import { GENERATION_REPOSITORY } from '../repositories/generation.tokens.js';

@Injectable()
export class CreateGenerationService {
  constructor(
    @Inject(GENERATION_REPOSITORY)
    private readonly generationRepository: GenerationRepository,

    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,
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
