import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

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
        archivedAt: IsNull(),
      },
    });
  }

  async findAllForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Project[]> {
    return this.repository.find({
      where: {
        userId,
        archivedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });
  }

  async update(
    projectId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id: projectId, userId, archivedAt: IsNull() },
      changes,
    );

    return result.affected === 1;
  }

  async archive(projectId: string, userId: string): Promise<boolean> {
    const result = await this.repository.update(
      { id: projectId, userId, archivedAt: IsNull() },
      { archivedAt: new Date() },
    );

    return result.affected === 1;
  }
}
