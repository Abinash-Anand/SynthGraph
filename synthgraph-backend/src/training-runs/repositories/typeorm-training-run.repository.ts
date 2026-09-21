import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import {
  TrainingRun,
  TrainingRunStatus,
} from '../../database/entities/training-run.entity.js';
import { TrainingRunRepository } from './training-run.repository.js';

@Injectable()
export class TypeOrmTrainingRunRepository
  implements TrainingRunRepository
{
  constructor(
    @InjectRepository(TrainingRun)
    private readonly repository: Repository<TrainingRun>,
  ) {}

  async create(trainingRun: TrainingRun): Promise<TrainingRun> {
    return this.repository.save(trainingRun);
  }

  async findByIdForUser(
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRun | null> {
    return this.repository
      .createQueryBuilder('trainingRun')
      .innerJoin('trainingRun.experiment', 'experiment')
      .innerJoin('experiment.project', 'project')
      .where('trainingRun.id = :trainingRunId', { trainingRunId })
      .andWhere('project.userId = :userId', { userId })
      .getOne();
  }

  async findAllForExperiment(
    experimentId: string,
  ): Promise<TrainingRun[]> {
    return this.repository.find({
      where: {
        experimentId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async transitionStatus(
    trainingRunId: string,
    currentStatus: TrainingRunStatus,
    nextStatus: TrainingRunStatus,
    startedAt: Date | null,
    completedAt: Date | null,
  ): Promise<boolean> {
    const result = await this.repository.update(
      {
        id: trainingRunId,
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