import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

export interface GenerationDatasetReferenceRepository {
  create(
    reference: GenerationDatasetReference,
  ): Promise<GenerationDatasetReference>;

  findForGeneration(
    generationId: string,
    userId: string,
  ): Promise<GenerationDatasetReference[]>;

  exists(
    generationId: string,
    datasetVersionId: string,
    role: string,
  ): Promise<boolean>;
}