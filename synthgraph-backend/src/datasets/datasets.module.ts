import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Dataset } from '../database/entities/dataset.entity.js';
import { DatasetVersion } from '../database/entities/dataset-version.entity.js';

import { DatasetsController } from './controllers/datasets.controller.js';

import {
  DATASET_REPOSITORY,
  DATASET_VERSION_REPOSITORY,
} from './repositories/dataset.tokens.js';

import { DatasetRepository } from './repositories/dataset.repository.js';
import { DatasetVersionRepository } from './repositories/dataset-version.repository.js';
import { TypeOrmDatasetRepository } from './repositories/typeorm-dataset.repository.js';
import { TypeOrmDatasetVersionRepository } from './repositories/typeorm-dataset-version.repository.js';

import { CreateDatasetService } from './services/create-dataset.service.js';
import { GetDatasetService } from './services/get-dataset.service.js';
import { ListDatasetsService } from './services/list-datasets.service.js';
import { CreateDatasetVersionService } from './services/create-dataset-version.service.js';
import { GetDatasetVersionService } from './services/get-dataset-version.service.js';
import { ListDatasetVersionsService } from './services/list-dataset-versions.service.js';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      Dataset,
      DatasetVersion,
    ]),
  ],

  controllers: [
    DatasetsController,
  ],

  providers: [
    {
      provide: DATASET_REPOSITORY,
      useFactory: (
        repository: Repository<Dataset>,
      ): DatasetRepository => {
        return new TypeOrmDatasetRepository(repository);
      },
      inject: [getRepositoryToken(Dataset)],
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

    CreateDatasetService,
    GetDatasetService,
    ListDatasetsService,
    CreateDatasetVersionService,
    GetDatasetVersionService,
    ListDatasetVersionsService,
  ],
})
export class DatasetsModule {}