import { Project } from '../../database/entities/project.entity.js';

export interface ProjectRepository {
  create(project: Project): Promise<Project>;

  findByIdForUser(projectId: string, userId: string): Promise<Project | null>;

  findAllForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Project[]>;
}
