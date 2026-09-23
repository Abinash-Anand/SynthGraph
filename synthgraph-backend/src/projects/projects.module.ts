import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from '../database/entities/project.entity.js';
import { TypeOrmProjectRepository } from './repositories/typeorm-project.repository.js';
import { PROJECT_REPOSITORY } from './repositories/project.tokens.js';
import { AuthModule } from '../auth/auth.module.js';
import { GetProjectService } from './services/get-project.service.js';
import { ProjectsController } from './projects.controller.js';
import { ListProjectsService } from './services/list-projects.service.js';
import { CreateProjectService } from './services/create-project.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), AuthModule],
  controllers: [ProjectsController],
  providers: [
    {
      provide: PROJECT_REPOSITORY,
      useClass: TypeOrmProjectRepository,
    },
    GetProjectService,
    CreateProjectService,
    ListProjectsService,
  ],
  exports: [PROJECT_REPOSITORY],
})
export class ProjectsModule {}
