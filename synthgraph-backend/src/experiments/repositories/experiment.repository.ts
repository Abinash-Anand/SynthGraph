import { Experiment } from '../../database/entities/experiment.entity.js';

export interface ExperimentRepository {
  create(experiment: Experiment): Promise<Experiment>;

  findByIdForProject(
    experimentId: string,
    projectId: string,
  ): Promise<Experiment | null>;

  findByIdForUser(
    experimentId: string,
    userId: string,
  ): Promise<Experiment | null>;

  findAllForProject(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<Experiment[]>;

  searchForProject(
    projectId: string,
    search: string,
    limit: number,
    offset: number,
  ): Promise<Experiment[]>;

  update(
    experimentId: string,
    userId: string,
    changes: { name?: string; description?: string },
  ): Promise<boolean>;

  archive(experimentId: string, userId: string): Promise<boolean>;
}