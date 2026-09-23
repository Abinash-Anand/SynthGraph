import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Generation,
  GenerationStatus,
} from '../../database/entities/generation.entity.js';
import { GenerationRepository } from './generation.repository.js';

@Injectable()
export class TypeOrmGenerationRepository implements GenerationRepository {
  constructor(
    @InjectRepository(Generation)
    private readonly repository: Repository<Generation>,
  ) {}

  async create(generation: Generation): Promise<Generation> {
    return this.repository.save(generation);
  }

  async findByIdForUser(
    generationId: string,
    userId: string,
  ): Promise<Generation | null> {
    return this.repository
      .createQueryBuilder('generation')
      .innerJoin('generation.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .where('generation.id = :generationId', { generationId })
      .andWhere('project.userId = :userId', { userId })
      .getOne();
  }

  async findAllForExperiment(
    experimentId: string,
    limit: number,
    offset: number,
  ): Promise<Generation[]> {
    return this.repository.find({
      where: {
        experimentId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findByParameters(
    experimentId: string,
    parameters: Record<string, unknown>,
    limit: number,
    offset: number,
  ): Promise<Generation[]> {
    const query = this.repository
      .createQueryBuilder('generation')
      .where('generation.experimentId = :experimentId', {
        experimentId,
      });

    Object.entries(parameters).forEach(([key, value], index) => {
      query.andWhere(
        `generation.parameters -> :parameterKey${index} @> :parameterValue${index}::jsonb`,
        {
          [`parameterKey${index}`]: key,
          [`parameterValue${index}`]: JSON.stringify(value),
        },
      );
    });

    return query
      .orderBy('generation.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
  }

  async transitionStatus(
    generationId: string,
    currentStatus: GenerationStatus,
    nextStatus: GenerationStatus,
    startedAt: Date | null,
    completedAt: Date | null,
  ): Promise<boolean> {
    const result = await this.repository.update(
      {
        id: generationId,
        status: currentStatus,
      },
      {
        status: nextStatus,
        startedAt,
        completedAt,
      },
    );

    return result.affected === 1;
  }
}