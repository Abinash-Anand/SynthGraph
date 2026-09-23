import { Module } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Asset } from '../database/entities/asset.entity.js';
import { AssetVersion } from '../database/entities/asset-version.entity.js';

import { AssetsController } from './controllers/assets.controller.js';

import {
  ASSET_REPOSITORY,
  ASSET_VERSION_REPOSITORY,
} from './repositories/asset.tokens.js';

import { AssetRepository } from './repositories/asset.repository.js';
import { AssetVersionRepository } from './repositories/asset-version.repository.js';
import { TypeOrmAssetRepository } from './repositories/typeorm-asset.repository.js';
import { TypeOrmAssetVersionRepository } from './repositories/typeorm-asset-version.repository.js';

import { CreateAssetService } from './services/create-asset.service.js';
import { GetAssetService } from './services/get-asset.service.js';
import { ListAssetsService } from './services/list-assets.service.js';
import { CreateAssetVersionService } from './services/create-asset-version.service.js';
import { GetAssetVersionService } from './services/get-asset-version.service.js';
import { ListAssetVersionsService } from './services/list-asset-versions.service.js';
import { UpdateAssetService } from './services/update-asset.service.js';
import { ArchiveAssetService } from './services/archive-asset.service.js';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      Asset,
      AssetVersion,
    ]),
  ],

  controllers: [
    AssetsController,
  ],

  providers: [
    {
      provide: ASSET_REPOSITORY,
      useFactory: (
        repository: Repository<Asset>,
      ): AssetRepository => {
        return new TypeOrmAssetRepository(repository);
      },
      inject: [getRepositoryToken(Asset)],
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

    CreateAssetService,
    GetAssetService,
    ListAssetsService,
    CreateAssetVersionService,
    GetAssetVersionService,
    ListAssetVersionsService,
    UpdateAssetService,
    ArchiveAssetService,
  ],
})
export class AssetsModule {}
