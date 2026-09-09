import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

export interface GenerationDatasetReferenceRepository {
  create(
    reference: GenerationDatasetReference,
  ): Promise<GenerationDatasetReference>;

  exists(
    generationId: string,
    datasetVersionId: string,
  ): Promise<boolean>;

  findForGeneration(
    generationId: string,
  ): Promise<GenerationDatasetReference[]>;

  findForGeneration(
    generationId: string,
    userId: string,
  ): Promise<GenerationDatasetReference[]>;
}