import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AssetVersionRepository } from '../../assets/repositories/asset-version.repository.js';
import { ASSET_VERSION_REPOSITORY } from '../../assets/repositories/asset.tokens.js';

import { GenerationAssetReference } from '../../database/entities/generation-asset-reference.entity.js';

import type { GenerationRepository } from '../repositories/generation.repository.js';
import { GENERATION_REPOSITORY } from '../repositories/generation.tokens.js';

import type { GenerationAssetReferenceRepository } from '../repositories/generation-asset-reference.repository.js';
import { GENERATION_ASSET_REFERENCE_REPOSITORY } from '../repositories/generation-asset-reference.tokens.js';

@Injectable()
export class CreateGenerationAssetReferenceService {
  constructor(
    @Inject(GENERATION_ASSET_REFERENCE_REPOSITORY)
    private readonly referenceRepository: GenerationAssetReferenceRepository,

    @Inject(ASSET_VERSION_REPOSITORY)
    private readonly assetVersionRepository: AssetVersionRepository,

    @Inject(GENERATION_REPOSITORY)
    private readonly generationRepository: GenerationRepository,
  ) {}

  async execute(
    generationId: string,
    userId: string,
    input: {
      assetVersionId: string;
      role: string;
    },
  ): Promise<GenerationAssetReference> {
    const generation = await this.generationRepository.findByIdForUser(
      generationId,
      userId,
    );

    if (!generation) {
      throw new NotFoundException('Generation not found');
    }

    const assetVersion =
      await this.assetVersionRepository.findByIdForUser(
        input.assetVersionId,
        userId,
      );

    if (!assetVersion) {
      throw new NotFoundException('Asset version not found');
    }

    const exists = await this.referenceRepository.exists(
      generationId,
      input.assetVersionId,
    );

    if (exists) {
      throw new ConflictException(
        'Asset version is already referenced by this generation',
      );
    }

    const reference = new GenerationAssetReference();

    reference.generationId = generationId;
    reference.assetVersionId = input.assetVersionId;
    reference.role = input.role;

    return this.referenceRepository.create(reference);
  }
}
