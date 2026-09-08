import { Injectable, NotFoundException } from '@nestjs/common';

import { TypeOrmProjectRepository } from '../repositories/typeorm-project.repository.js';

@Injectable()
export class GetProjectService {
  constructor(private readonly projectRepository: TypeOrmProjectRepository) {}

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
