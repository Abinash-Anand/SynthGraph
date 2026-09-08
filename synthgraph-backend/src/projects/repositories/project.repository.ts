import { Project } from "../../database/entities/project.entity.js";

export interface ProjectRepository {
  create(project: Project): Promise<Project>;
}