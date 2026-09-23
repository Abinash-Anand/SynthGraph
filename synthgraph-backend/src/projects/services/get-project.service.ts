import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ProjectRepository } from '../repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../repositories/project.tokens.js';

@Injectable()
export class GetProjectService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(projectId: string, userId: string) {
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
