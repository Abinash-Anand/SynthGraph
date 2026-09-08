import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Experiment } from '../database/entities/experiment.entity.js';
import { Project } from '../database/entities/project.entity.js';
import { TypeOrmProjectRepository } from '../projects/repositories/typeorm-project.repository.js';
import { CreateExperimentService } from './services/create-experiment.service.js';
import { GetExperimentService } from './services/get-experiment.service.js';
import { ListExperimentsService } from './services/list-experiments.service.js';
import { TypeOrmExperimentRepository } from './repositories/typeorm-experiment.repository.js';
import { ExperimentsController } from './experiments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Experiment, Project]), AuthModule],
  controllers: [ExperimentsController],
  providers: [
    TypeOrmExperimentRepository,
    TypeOrmProjectRepository,
    CreateExperimentService,
    ListExperimentsService,
    GetExperimentService,
  ],
})
export class ExperimentsModule {}
