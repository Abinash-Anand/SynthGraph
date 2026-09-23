import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ExperimentRepository } from '../repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../repositories/experiment.tokens.js';

@Injectable()
export class ArchiveExperimentService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,
  ) {}

  async execute(experimentId: string, userId: string): Promise<void> {
    const archived = await this.experimentRepository.archive(
      experimentId,
      userId,
    );

    if (!archived) {
      throw new NotFoundException('Experiment not found');
    }
  }
}
