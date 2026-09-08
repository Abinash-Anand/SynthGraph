import { Injectable, NotFoundException } from '@nestjs/common';

import { Experiment } from '../../database/entities/experiment.entity.js';
import { TypeOrmProjectRepository } from '../../projects/repositories/typeorm-project.repository.js';
import { TypeOrmExperimentRepository } from '../repositories/typeorm-experiment.repository.js';

@Injectable()
export class GetExperimentService {
  constructor(
    private readonly experimentRepository: TypeOrmExperimentRepository,
    private readonly projectRepository: TypeOrmProjectRepository,
  ) {}

  async execute(
    projectId: string,
    experimentId: string,
    userId: string,
  ): Promise<Experiment> {
    const project = await this.projectRepository.findByIdForUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const experiment = await this.experimentRepository.findByIdForProject(
      experimentId,
      projectId,
    );

    if (!experiment) {
      throw new NotFoundException('Experiment not found');
    }

    return experiment;
  }
}
