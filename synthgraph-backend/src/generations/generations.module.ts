import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { Generation } from '../database/entities/generation.entity.js';
import { TypeOrmExperimentRepository } from '../experiments/repositories/typeorm-experiment.repository.js';
import { GenerationsController } from './generations.controller.js';
import { TypeOrmGenerationRepository } from './repositories/typeorm-generation.repository.js';
import { CreateGenerationService } from './services/create-generation.service.js';
import { GetGenerationService } from './services/get-generation.service.js';
import { ListGenerationsService } from './services/list-generations.service.js';
import { UpdateGenerationStatusService } from './services/update-generation-status.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Generation, Experiment]), AuthModule],
  controllers: [GenerationsController],
  providers: [
    TypeOrmGenerationRepository,
    TypeOrmExperimentRepository,
    CreateGenerationService,
    GetGenerationService,
    ListGenerationsService,
    UpdateGenerationStatusService,
  ],
})
export class GenerationsModule {}
