import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TrainingRunMetric } from '../../database/entities/training-run-metric.entity.js';
import { TrainingRunMetricRepository } from './training-run-metric.repository.js';

@Injectable()
export class TypeOrmTrainingRunMetricRepository
  implements TrainingRunMetricRepository
{
  constructor(
    @InjectRepository(TrainingRunMetric)
    private readonly repository: Repository<TrainingRunMetric>,
  ) {}

  async create(
    trainingRunMetric: TrainingRunMetric,
  ): Promise<TrainingRunMetric> {
    return this.repository.save(trainingRunMetric);
  }

  async createMany(
    trainingRunMetrics: TrainingRunMetric[],
  ): Promise<TrainingRunMetric[]> {
    return this.repository.save(trainingRunMetrics);
  }

  async findAllForTrainingRun(
    trainingRunId: string,
    limit: number,
    offset: number,
  ): Promise<TrainingRunMetric[]> {
    return this.repository.find({
      where: {
        trainingRunId,
      },
      order: {
        step: 'ASC',
        createdAt: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }
}
