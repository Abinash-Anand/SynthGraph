import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { Generation } from '../database/entities/generation.entity.js';
import { GenerationDatasetReference } from '../database/entities/generation-dataset-reference.entity.js';

import { TypeOrmExperimentRepository } from '../experiments/repositories/typeorm-experiment.repository.js';

import { DatasetVersion } from '../database/entities/dataset-version.entity.js';
import { DATASET_VERSION_REPOSITORY } from '../datasets/repositories/dataset.tokens.js';
import type { DatasetVersionRepository } from '../datasets/repositories/dataset-version.repository.js';
import { TypeOrmDatasetVersionRepository } from '../datasets/repositories/typeorm-dataset-version.repository.js';

import { GenerationsController } from './generations.controller.js';

import { GENERATION_DATASET_REFERENCE_REPOSITORY } from './repositories/generation-dataset-reference.tokens.js';
import { TypeOrmGenerationDatasetReferenceRepository } from './repositories/typeorm-generation-dataset-reference.repository.js';

import { TypeOrmGenerationRepository } from './repositories/typeorm-generation.repository.js';

import { CreateGenerationService } from './services/create-generation.service.js';
import { GetGenerationService } from './services/get-generation.service.js';
import { ListGenerationsService } from './services/list-generations.service.js';
import { UpdateGenerationStatusService } from './services/update-generation-status.service.js';
import { CreateGenerationDatasetReferenceService } from './services/create-generation-dataset-reference.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Generation,
      Experiment,
      GenerationDatasetReference,
      DatasetVersion,
    ]),
    AuthModule,
  ],

  controllers: [
    GenerationsController,
  ],

  providers: [
    TypeOrmGenerationRepository,
    TypeOrmExperimentRepository,

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
      provide: GENERATION_DATASET_REFERENCE_REPOSITORY,
      useClass: TypeOrmGenerationDatasetReferenceRepository,
    },

    CreateGenerationService,
    GetGenerationService,
    ListGenerationsService,
    UpdateGenerationStatusService,
    CreateGenerationDatasetReferenceService,
  ],
})
export class GenerationsModule {}