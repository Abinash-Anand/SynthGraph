import { Module } from '@nestjs/common';
import {
  getRepositoryToken,
  TypeOrmModule,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module.js';

import { Experiment } from '../database/entities/experiment.entity.js';
import { Generation } from '../database/entities/generation.entity.js';
import { GenerationDatasetReference } from '../database/entities/generation-dataset-reference.entity.js';

import { TypeOrmExperimentRepository } from '../experiments/repositories/typeorm-experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from '../experiments/repositories/experiment.tokens.js';
import { TypeOrmGenerationRepository } from '../generations/repositories/typeorm-generation.repository.js';
import { GENERATION_REPOSITORY } from '../generations/repositories/generation.tokens.js';

import { ReproductionController } from './reproduction.controller.js';

import { REPRODUCTION_REPOSITORY } from './repositories/reproduction.repository.token.js';
import { TypeOrmReproductionRepository } from './repositories/typeorm-reproduction.repository.js';

import { GetReproductionManifestService } from './services/get-reproduction-manifest.service.js';
import { ListReproductionManifestsService } from './services/list-reproduction-manifests.service.js';

@Module({
  imports: [
    AuthModule,

    TypeOrmModule.forFeature([
      Experiment,
      Generation,
      GenerationDatasetReference,
    ]),
  ],

  controllers: [
    ReproductionController,
  ],

  providers: [
    {
      provide: EXPERIMENT_REPOSITORY,
      useClass: TypeOrmExperimentRepository,
    },

    {
      provide: GENERATION_REPOSITORY,
      useClass: TypeOrmGenerationRepository,
    },

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
    ListReproductionManifestsService,
  ],

  exports: [
    GetReproductionManifestService,
  ],
})
export class ReproductionModule {}