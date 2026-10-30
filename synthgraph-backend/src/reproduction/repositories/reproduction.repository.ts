import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

export interface ReproductionRepository {
  findDatasetReferences(
    generationId: string,
  ): Promise<GenerationDatasetReference[]>;

  findDatasetReferencesForGenerations(
    generationIds: string[],
  ): Promise<GenerationDatasetReference[]>;
}