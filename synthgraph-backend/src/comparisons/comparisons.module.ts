import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Generation } from '../database/entities/generation.entity.js';
import { TrainingRun } from '../database/entities/training-run.entity.js';
import { TypeOrmGenerationRepository } from '../generations/repositories/typeorm-generation.repository.js';
import { GENERATION_REPOSITORY } from '../generations/repositories/generation.tokens.js';
import { TypeOrmTrainingRunRepository } from '../training-runs/repositories/typeorm-training-run.repository.js';
import { TRAINING_RUN_REPOSITORY } from '../training-runs/repositories/training-run.tokens.js';

import { ComparisonsController } from './comparisons.controller.js';
import { CompareGenerationsService } from './services/compare-generations.service.js';
import { CompareTrainingRunsService } from './services/compare-training-runs.service.js';
import { TrainingRunComparisonsController } from './training-run-comparisons.controller.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Generation, TrainingRun]),
  ],
  controllers: [ComparisonsController, TrainingRunComparisonsController],
  providers: [
    {
      provide: GENERATION_REPOSITORY,
      useClass: TypeOrmGenerationRepository,
    },

    CompareGenerationsService,

    {
      provide: TRAINING_RUN_REPOSITORY,
      useClass: TypeOrmTrainingRunRepository,
    },

    CompareTrainingRunsService,
  ],
})
export class ComparisonsModule {}