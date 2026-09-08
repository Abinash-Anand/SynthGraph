import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Experiment } from '../../database/entities/experiment.entity.js';
import { TypeOrmProjectRepository } from '../../projects/repositories/typeorm-project.repository.js';
import { TypeOrmExperimentRepository } from '../repositories/typeorm-experiment.repository.js';

@Injectable()
export class CreateExperimentService {
  constructor(
    private readonly experimentRepository: TypeOrmExperimentRepository,
    private readonly projectRepository: TypeOrmProjectRepository,
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