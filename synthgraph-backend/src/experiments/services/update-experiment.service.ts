import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Experiment } from '../../database/entities/experiment.entity.js';
import type { ExperimentRepository } from '../repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../repositories/experiment.tokens.js';

@Injectable()
export class UpdateExperimentService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,
  ) {}

  async execute(
    experimentId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<Experiment> {
    if (changes.name === undefined && changes.description === undefined) {
      throw new BadRequestException(
        'At least one of name or description must be provided',
      );
    }

    const updated = await this.experimentRepository.update(
      experimentId,
      userId,
      changes,
    );

    if (!updated) {
      throw new NotFoundException('Experiment not found');
    }

    const experiment = await this.experimentRepository.findByIdForUser(
      experimentId,
      userId,
    );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    return experiment;
  }
}
