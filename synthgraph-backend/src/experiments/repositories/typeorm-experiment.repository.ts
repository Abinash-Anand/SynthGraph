import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
      .orderBy('experiment.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
  }
}