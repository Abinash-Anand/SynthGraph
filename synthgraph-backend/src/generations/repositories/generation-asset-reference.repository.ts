import { GenerationAssetReference } from '../../database/entities/generation-asset-reference.entity.js';

export interface GenerationAssetReferenceRepository {
  create(
    reference: GenerationAssetReference,
  ): Promise<GenerationAssetReference>;

  exists(
    generationId: string,
    assetVersionId: string,
  ): Promise<boolean>;

  findForGeneration(
    generationId: string,
  ): Promise<GenerationAssetReference[]>;

  findForGeneration(
    generationId: string,
    userId: string,
  ): Promise<GenerationAssetReference[]>;
}
