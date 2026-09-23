import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Experiment } from '../../database/entities/experiment.entity.js';
import type { ProjectRepository } from '../../projects/repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../../projects/repositories/project.tokens.js';
import type { ExperimentRepository } from '../repositories/experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../repositories/experiment.tokens.js';

@Injectable()
export class ListExperimentsService {
  constructor(
    @Inject(EXPERIMENT_REPOSITORY)
    private readonly experimentRepository: ExperimentRepository,

    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(
    projectId: string,
    userId: string,
    search: string | undefined,
    limit: number,
    offset: number,
  ): Promise<Experiment[]> {
    const project = await this.projectRepository.findByIdForUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (search !== undefined) {
      return this.experimentRepository.searchForProject(
        projectId,
        search,
        limit,
        offset,
      );
    }

    return this.experimentRepository.findAllForProject(
      projectId,
      limit,
      offset,
    );
  }
}