import {
  Generation,
  GenerationStatus,
} from '../../database/entities/generation.entity.js';

export interface GenerationRepository {
  create(generation: Generation): Promise<Generation>;

  findByIdForUser(
    generationId: string,
    userId: string,
  ): Promise<Generation | null>;

  findAllForExperiment(
    experimentId: string,
    limit: number,
    offset: number,
  ): Promise<Generation[]>;

  findByParameters(
    experimentId: string,
    parameters: Record<string, unknown>,
    limit: number,
    offset: number,
  ): Promise<Generation[]>;

  transitionStatus(
    generationId: string,
    currentStatus: GenerationStatus,
    nextStatus: GenerationStatus,
    startedAt: Date | null,
    completedAt: Date | null,
  ): Promise<boolean>;
}