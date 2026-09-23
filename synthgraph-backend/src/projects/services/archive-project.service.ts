import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ProjectRepository } from '../repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../repositories/project.tokens.js';

@Injectable()
export class ArchiveProjectService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(projectId: string, userId: string): Promise<void> {
    const archived = await this.projectRepository.archive(projectId, userId);

    if (!archived) {
      throw new NotFoundException('Project not found');
    }
  }
}
