import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Project } from '../../database/entities/project.entity.js';
import { ProjectRepository } from './project.repository.js';

@Injectable()
export class TypeOrmProjectRepository implements ProjectRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repository: Repository<Project>,
  ) {}

  async create(project: Project): Promise<Project> {
    return this.repository.save(project);
  }

  async findByIdForUser(
    projectId: string,
    userId: string,
  ): Promise<Project | null> {
    return this.repository.findOne({
      where: {
        id: projectId,
        userId,
      },
    });
  }

  async findAllForUser(userId: string): Promise<Project[]> {
    return this.repository.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
