import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Experiment } from '../../database/entities/experiment.entity.js';
import type { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../../projects/repositories/project.tokens.js';
import type { ExperimentRepository } from '../repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../repositories/experiment.tokens.js';

@Injectable()
export class GetExperimentService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async executeForProject(
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

  async executeForUser(
    experimentId: string,
    userId: string,
  ): Promise<Experiment> {
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
