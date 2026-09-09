import { Injectable } from '@nestjs/common';
import { Project } from '../../database/entities/project.entity.js';
import { TypeOrmProjectRepository } from '../repositories/typeorm-project.repository.js';

@Injectable()
export class ListProjectsService {
  constructor(private readonly projectRepository: TypeOrmProjectRepository) {}

  async execute(userId: string): Promise<Project[]> {
    return this.projectRepository.findAllForUser(userId);
  }
}
