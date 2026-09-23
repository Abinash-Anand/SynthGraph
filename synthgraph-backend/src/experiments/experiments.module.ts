import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { Project } from '../database/entities/project.entity.js';
import { TypeOrmProjectRepository } from '../projects/repositories/typeorm-project.repository.js';
import { PROJECT_REPOSITORY } from '../projects/repositories/project.tokens.js';
import { CreateExperimentService } from './services/create-experiment.service.js';
import { GetExperimentService } from './services/get-experiment.service.js';
import { ListExperimentsService } from './services/list-experiments.service.js';
import { TypeOrmExperimentRepository } from './repositories/typeorm-experiment.repository.js';
import { EXPERIMENT_REPOSITORY } from './repositories/experiment.tokens.js';
import { ExperimentsController } from './experiments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Experiment, Project]), AuthModule],
  controllers: [ExperimentsController],
  providers: [
    {
      provide: EXPERIMENT_REPOSITORY,
      useClass: TypeOrmExperimentRepository,
    },
    {
      provide: PROJECT_REPOSITORY,
      useClass: TypeOrmProjectRepository,
    },
    CreateExperimentService,
    ListExperimentsService,
    GetExperimentService,
  ],
  exports: [EXPERIMENT_REPOSITORY],
})
export class ExperimentsModule {}
