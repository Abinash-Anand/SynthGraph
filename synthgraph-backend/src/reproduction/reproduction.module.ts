import { Module } from '@nestjs/common';
import {
  getRepositoryToken,
  TypeOrmModule,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';

import { Generation } from '../database/entities/generation.entity.js';
import { GenerationDatasetReference } from '../database/entities/generation-dataset-reference.entity.js';

import { TypeOrmGenerationRepository } from '../generations/repositories/typeorm-generation.repository.js';

import { ReproductionController } from './reproduction.controller.js';

import { ReproductionRepository } from './repositories/reproduction.repository.js';
import { REPRODUCTION_REPOSITORY } from './repositories/reproduction.repository.token.js';
import { TypeOrmReproductionRepository } from './repositories/typeorm-reproduction.repository.js';

import { GetReproductionManifestService } from './services/get-reproduction-manifest.service.js';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      Generation,
      GenerationDatasetReference,
    ]),
  ],

  controllers: [
    ReproductionController,
  ],

  providers: [
    TypeOrmGenerationRepository,

    {
      provide: REPRODUCTION_REPOSITORY,

      useFactory: (
        datasetReferenceRepository: Repository<GenerationDatasetReference>,
      ) =>
        new TypeOrmReproductionRepository(
          datasetReferenceRepository,
        ),

      inject: [
        getRepositoryToken(
          GenerationDatasetReference,
        ),
      ],
    },

    GetReproductionManifestService,
  ],

  exports: [
    GetReproductionManifestService,
  ],
})
export class ReproductionModule {}