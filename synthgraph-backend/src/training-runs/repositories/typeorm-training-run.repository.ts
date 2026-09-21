import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import {
  TrainingRun,
  TrainingRunCaptureStatus,
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

  async findByCaptureStatus(
    experimentId: string,
    captureStatus: 'complete' | 'partial' | 'unknown',
  ): Promise<TrainingRun[]> {
    const query = this.repository
      .createQueryBuilder('trainingRun')
      .where('trainingRun.experimentId = :experimentId', { experimentId });

    if (captureStatus === 'unknown') {
      // NULL is the deliberate "never reported" sentinel (see the entity
      // comment on captureStatus) - "unknown" queries for it directly
      // rather than a status value that would never actually be stored.
      query.andWhere('trainingRun.captureStatus IS NULL');
    } else {
      query.andWhere(
        "trainingRun.captureStatus ->> 'status' = :captureStatus",
        { captureStatus },
      );
    }

    return query.orderBy('trainingRun.createdAt', 'DESC').getMany();
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

  async updateCaptureStatus(
    trainingRunId: string,
    captureStatus: TrainingRunCaptureStatus,
  ): Promise<boolean> {
    const result = await this.repository.update(
      { id: trainingRunId },
      { captureStatus },
    );

    return result.affected === 1;
  }
}