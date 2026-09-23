import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Project } from '../../database/entities/project.entity.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../repositories/project.tokens.js';

@Injectable()
export class UpdateProjectService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(
    projectId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<Project> {
    if (changes.name === undefined && changes.description === undefined) {
      throw new BadRequestException(
        'At least one of name or description must be provided',
      );
    }

    const updated = await this.projectRepository.update(
      projectId,
      userId,
      changes,
    );

    if (!updated) {
      throw new NotFoundException('Project not found');
    }

    const project = await this.projectRepository.findByIdForUser(
      projectId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
