import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Dataset } from '../database/entities/dataset.entity.js';
import { DatasetVersion } from '../database/entities/dataset-version.entity.js';
import { EvaluationResult } from '../database/entities/evaluation-result.entity.js';
import { TrainingRun } from '../database/entities/training-run.entity.js';

import { DATASET_VERSION_REPOSITORY } from '../datasets/repositories/dataset.tokens.js';
import type { DatasetVersionRepository } from '../datasets/repositories/dataset-version.repository.js';
import { TypeOrmDatasetVersionRepository } from '../datasets/repositories/typeorm-dataset-version.repository.js';

import { TRAINING_RUN_REPOSITORY } from '../training-runs/repositories/training-run.tokens.js';
import type { TrainingRunRepository } from '../training-runs/repositories/training-run.repository.js';
import { TypeOrmTrainingRunRepository } from '../training-runs/repositories/typeorm-training-run.repository.js';

import { EvaluationResultsController } from './evaluation-results.controller.js';
import { EVALUATION_RESULT_REPOSITORY } from './repositories/evaluation-result.tokens.js';
import type { EvaluationResultRepository } from './repositories/evaluation-result.repository.js';
import { TypeOrmEvaluationResultRepository } from './repositories/typeorm-evaluation-result.repository.js';
import { CreateEvaluationResultService } from './services/create-evaluation-result.service.js';
import { GetEvaluationResultService } from './services/get-evaluation-result.service.js';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      Dataset,
      DatasetVersion,
      EvaluationResult,
      TrainingRun,
    ]),
  ],

  controllers: [
    EvaluationResultsController,
  ],

  providers: [
    {
      provide: EVALUATION_RESULT_REPOSITORY,
      useFactory: (
        repository: Repository<EvaluationResult>,
      ): EvaluationResultRepository => {
        return new TypeOrmEvaluationResultRepository(repository);
      },
      inject: [getRepositoryToken(EvaluationResult)],
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

    {
      provide: DATASET_VERSION_REPOSITORY,
      useFactory: (
        repository: Repository<DatasetVersion>,
      ): DatasetVersionRepository => {
        return new TypeOrmDatasetVersionRepository(repository);
      },
      inject: [getRepositoryToken(DatasetVersion)],
    },

    CreateEvaluationResultService,
    GetEvaluationResultService,
  ],
})
export class EvaluationResultsModule {}