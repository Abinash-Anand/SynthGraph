import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { TrainingRun } from '../database/entities/training-run.entity.js';
import { TrainingRunMetric } from '../database/entities/training-run-metric.entity.js';

import { TRAINING_RUN_REPOSITORY } from '../training-runs/repositories/training-run.tokens.js';
import type { TrainingRunRepository } from '../training-runs/repositories/training-run.repository.js';
import { TypeOrmTrainingRunRepository } from '../training-runs/repositories/typeorm-training-run.repository.js';

import { TrainingRunMetricsController } from './training-run-metrics.controller.js';
import { TRAINING_RUN_METRIC_REPOSITORY } from './repositories/training-run-metric.tokens.js';
import type { TrainingRunMetricRepository } from './repositories/training-run-metric.repository.js';
import { TypeOrmTrainingRunMetricRepository } from './repositories/typeorm-training-run-metric.repository.js';
import { CreateTrainingRunMetricService } from './services/create-training-run-metric.service.js';
import { ListTrainingRunMetricsService } from './services/list-training-run-metrics.service.js';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      TrainingRun,
      TrainingRunMetric,
    ]),
  ],

  controllers: [
    TrainingRunMetricsController,
  ],

  providers: [
    {
      provide: TRAINING_RUN_METRIC_REPOSITORY,
      useFactory: (
        repository: Repository<TrainingRunMetric>,
      ): TrainingRunMetricRepository => {
        return new TypeOrmTrainingRunMetricRepository(repository);
      },
      inject: [getRepositoryToken(TrainingRunMetric)],
    },

    {
      provide: TRAINING_RUN_REPOSITORY,
      useFactory: (
        repository: Repository<TrainingRun>,
      ): TrainingRunRepository => {
        return new TypeOrmTrainingRunRepository(repository);
      },
      inject: [getRepositoryToken(TrainingRun)],
    },

    CreateTrainingRunMetricService,
    ListTrainingRunMetricsService,
  ],
})
export class TrainingRunMetricsModule {}
