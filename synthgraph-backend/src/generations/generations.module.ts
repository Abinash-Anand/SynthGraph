import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { Generation } from '../database/entities/generation.entity.js';
import { GenerationDatasetReference } from '../database/entities/generation-dataset-reference.entity.js';
import { GenerationAssetReference } from '../database/entities/generation-asset-reference.entity.js';

import { TypeOrmExperimentRepository } from '../experiments/repositories/typeorm-experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../experiments/repositories/experiment.tokens.js';

import { DatasetVersion } from '../database/entities/dataset-version.entity.js';
import { DATASET_VERSION_REPOSITORY } from '../datasets/repositories/dataset.tokens.js';
import type { DatasetVersionRepository } from '../datasets/repositories/dataset-version.repository.js';
import { TypeOrmDatasetVersionRepository } from '../datasets/repositories/typeorm-dataset-version.repository.js';

import { AssetVersion } from '../database/entities/asset-version.entity.js';
import { ASSET_VERSION_REPOSITORY } from '../assets/repositories/asset.tokens.js';
import type { AssetVersionRepository } from '../assets/repositories/asset-version.repository.js';
import { TypeOrmAssetVersionRepository } from '../assets/repositories/typeorm-asset-version.repository.js';

import { GenerationsController } from './generations.controller.js';

import { GENERATION_DATASET_REFERENCE_REPOSITORY } from './repositories/generation-dataset-reference.tokens.js';
import { TypeOrmGenerationDatasetReferenceRepository } from './repositories/typeorm-generation-dataset-reference.repository.js';

import { GENERATION_ASSET_REFERENCE_REPOSITORY } from './repositories/generation-asset-reference.tokens.js';
import { TypeOrmGenerationAssetReferenceRepository } from './repositories/typeorm-generation-asset-reference.repository.js';

import { TypeOrmGenerationRepository } from './repositories/typeorm-generation.repository.js';
import { GENERATION_REPOSITORY } from './repositories/generation.tokens.js';

import { CreateGenerationService } from './services/create-generation.service.js';
import { GetGenerationService } from './services/get-generation.service.js';
import { ListGenerationsService } from './services/list-generations.service.js';
import { UpdateGenerationStatusService } from './services/update-generation-status.service.js';
import { CreateGenerationDatasetReferenceService } from './services/create-generation-dataset-reference.service.js';
import { CreateGenerationAssetReferenceService } from './services/create-generation-asset-reference.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Generation,
      Experiment,
      GenerationDatasetReference,
      DatasetVersion,
      GenerationAssetReference,
      AssetVersion,
    ]),
    AuthModule,
  ],

  controllers: [
    GenerationsController,
  ],

  providers: [
    {
      provide: GENERATION_REPOSITORY,
      useClass: TypeOrmGenerationRepository,
    },

    {
      provide: EXPERIMENT_REPOSITORY,
      useClass: TypeOrmExperimentRepository,
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
      provide: GENERATION_DATASET_REFERENCE_REPOSITORY,
      useClass: TypeOrmGenerationDatasetReferenceRepository,
    },

    {
      provide: ASSET_VERSION_REPOSITORY,
      useFactory: (
        repository: Repository<AssetVersion>,
      ): AssetVersionRepository => {
        return new TypeOrmAssetVersionRepository(repository);
      },
      inject: [getRepositoryToken(AssetVersion)],
    },

    {
      provide: GENERATION_ASSET_REFERENCE_REPOSITORY,
      useClass: TypeOrmGenerationAssetReferenceRepository,
    },

    CreateGenerationService,
    GetGenerationService,
    ListGenerationsService,
    UpdateGenerationStatusService,
    CreateGenerationDatasetReferenceService,
    CreateGenerationAssetReferenceService,
  ],

  exports: [GENERATION_REPOSITORY],
})
export class GenerationsModule {}