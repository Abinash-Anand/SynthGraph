import { Inject, Injectable } from '@nestjs/common';
import { Project } from '../../database/entities/project.entity.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import { PROJECT_REPOSITORY } from '../repositories/project.tokens.js';

@Injectable()
export class CreateProjectService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  async execute(
    userId: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    const project = new Project();

    project.userId = userId;
    project.name = name;
    project.description = description ?? null;

    return this.projectRepository.create(project);
  }
}
