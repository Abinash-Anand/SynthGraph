import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Experiment } from '../../database/entities/experiment.entity.js';
import { ExperimentRepository } from './experiment.repository.js';

@Injectable()
export class TypeOrmExperimentRepository implements ExperimentRepository {
  constructor(
    @InjectRepository(Experiment)
    private readonly repository: Repository<Experiment>,
  ) {}

  async create(experiment: Experiment): Promise<Experiment> {
    return this.repository.save(experiment);
  }

  async findByIdForProject(
    experimentId: string,
    projectId: string,
  ): Promise<Experiment | null> {
    return this.repository.findOne({
      where: {
        id: experimentId,
        projectId,
        archivedAt: IsNull(),
      },
    });
  }

  async findByIdForUser(
    experimentId: string,
    userId: string,
  ): Promise<Experiment | null> {
    return this.repository
      .createQueryBuilder('experiment')
      .innerJoin('experiment.project', 'project')
      .where('experiment.id = :experimentId', { experimentId })
      .andWhere('project.userId = :userId', { userId })
      .andWhere('experiment.archivedAt IS NULL')
      .getOne();
  }

  async findAllForProject(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<Experiment[]> {
    return this.repository.find({
      where: {
        projectId,
        archivedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });
  }

  async searchForProject(
    projectId: string,
    search: string,
    limit: number,
    offset: number,
  ): Promise<Experiment[]> {
    return this.repository
      .createQueryBuilder('experiment')
      .where('experiment.projectId = :projectId', { projectId })
      .andWhere(
        '(experiment.name ILIKE :search OR experiment.description ILIKE :search)',
        { search: `%${search}%` },
      )
      .andWhere('experiment.archivedAt IS NULL')
      .orderBy('experiment.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
  }

  async update(
    experimentId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Experiment)
      .set(changes)
      .where('id = :experimentId', { experimentId })
      .andWhere('archived_at IS NULL')
      .andWhere(
        'project_id IN (SELECT id FROM projects WHERE user_id = :userId)',
        { userId },
      )
      .execute();

    return result.affected === 1;
  }

  async archive(experimentId: string, userId: string): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .update(Experiment)
      .set({ archivedAt: new Date() })
      .where('id = :experimentId', { experimentId })
      .andWhere('archived_at IS NULL')
      .andWhere(
        'project_id IN (SELECT id FROM projects WHERE user_id = :userId)',
        { userId },
      )
      .execute();

    return result.affected === 1;
  }
}