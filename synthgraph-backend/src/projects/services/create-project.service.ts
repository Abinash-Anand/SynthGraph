import { Injectable } from '@nestjs/common';
import { Project } from '../../database/entities/project.entity.js';
import { TypeOrmProjectRepository } from '../repositories/typeorm-project.repository.js';

@Injectable()
export class CreateProjectService {
  constructor(
    private readonly projectRepository: TypeOrmProjectRepository,
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