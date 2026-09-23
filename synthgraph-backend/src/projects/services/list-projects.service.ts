import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../database/entities/project.entity.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../repositories/project.tokens.js';

@Injectable()
export class ListProjectsService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Project[]> {
    return this.projectRepository.findAllForUser(userId, limit, offset);
  }
}
