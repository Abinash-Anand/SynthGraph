import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from '../database/entities/project.entity.js';
import { TypeOrmProjectRepository } from './repositories/typeorm-project.repository.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    UsersModule,
  ],
  providers: [TypeOrmProjectRepository],
  exports: [TypeOrmProjectRepository],
})
export class ProjectsModule {}