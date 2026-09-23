import { Injectable, NotFoundException } from '@nestjs/common';

import { Experiment } from '../../database/entities/experiment.entity.js';
import { TypeOrmProjectRepository } from '../../projects/repositories/typeorm-project.repository.js';
import { TypeOrmExperimentRepository } from '../repositories/typeorm-experiment.repository.js';

@Injectable()
export class ListExperimentsService {
  constructor(
    private readonly experimentRepository: TypeOrmExperimentRepository,
    private readonly projectRepository: TypeOrmProjectRepository,
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