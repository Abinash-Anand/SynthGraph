import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';

import { DatasetVersion } from '../database/entities/dataset-version.entity.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { TrainingRunDatasetReference } from '../database/entities/training-run-dataset-reference.entity.js';
import { TrainingRun } from '../database/entities/training-run.entity.js';

import { DATASET_VERSION_REPOSITORY } from '../datasets/repositories/dataset.tokens.js';
import type { DatasetVersionRepository } from '../datasets/repositories/dataset-version.repository.js';
import { TypeOrmDatasetVersionRepository } from '../datasets/repositories/typeorm-dataset-version.repository.js';

import { TypeOrmExperimentRepository } from '../experiments/repositories/typeorm-experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../experiments/repositories/experiment.tokens.js';

import { TrainingRunsController } from './training-runs.controller.js';

import { TRAINING_RUN_DATASET_REFERENCE_REPOSITORY } from './repositories/training-run-dataset-reference.tokens.js';
import { TypeOrmTrainingRunDatasetReferenceRepository } from './repositories/typeorm-training-run-dataset-reference.repository.js';

import { TRAINING_RUN_REPOSITORY } from './repositories/training-run.tokens.js';
import { TypeOrmTrainingRunRepository } from './repositories/typeorm-training-run.repository.js';

import { CreateTrainingRunDatasetReferenceService } from './services/create-training-run-dataset-reference.service.js';
import { CreateTrainingRunService } from './services/create-training-run.service.js';
import { GetTrainingRunService } from './services/get-training-run.service.js';
import { ListTrainingRunsService } from './services/list-training-runs.service.js';
import { UpdateTrainingRunCaptureStatusService } from './services/update-training-run-capture-status.service.js';
import { UpdateTrainingRunStatusService } from './services/update-training-run-status.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Experiment,
      TrainingRun,
      TrainingRunDatasetReference,
      DatasetVersion,
    ]),
    AuthModule,
  ],
  controllers: [TrainingRunsController],
  providers: [
    {
      provide: EXPERIMENT_REPOSITORY,
      useClass: TypeOrmExperimentRepository,
    },

    {
      provide: TRAINING_RUN_REPOSITORY,
      useClass: TypeOrmTrainingRunRepository,
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

    {
      provide: TRAINING_RUN_DATASET_REFERENCE_REPOSITORY,
      useClass: TypeOrmTrainingRunDatasetReferenceRepository,
    },

    CreateTrainingRunService,
    GetTrainingRunService,
    ListTrainingRunsService,
    UpdateTrainingRunStatusService,
    UpdateTrainingRunCaptureStatusService,
    CreateTrainingRunDatasetReferenceService,
  ],
})
export class TrainingRunsModule {}