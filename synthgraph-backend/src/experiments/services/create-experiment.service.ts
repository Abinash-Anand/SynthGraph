import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Experiment } from '../../database/entities/experiment.entity.js';
import type { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../../projects/repositories/project.tokens.js';
import type { ExperimentRepository } from '../repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../repositories/experiment.tokens.js';

@Injectable()
export class CreateExperimentService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(
    projectId: string,
    userId: string,
    name: string,
    description?: string,
  ): Promise<Experiment> {
    const project = await this.projectRepository.findByIdForUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const experiment = new Experiment();

    experiment.projectId = project.id;
    experiment.name = name;
    experiment.description = description ?? null;

    return this.experimentRepository.create(experiment);
  }
}
