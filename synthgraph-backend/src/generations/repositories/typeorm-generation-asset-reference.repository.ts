import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GenerationAssetReference } from '../../database/entities/generation-asset-reference.entity.js';

import { GenerationAssetReferenceRepository } from './generation-asset-reference.repository.js';

@Injectable()
export class TypeOrmGenerationAssetReferenceRepository
  implements GenerationAssetReferenceRepository
{
  constructor(
    @InjectRepository(GenerationAssetReference)
    private readonly repository: Repository<GenerationAssetReference>,
  ) {}

  async create(
    reference: GenerationAssetReference,
  ): Promise<GenerationAssetReference> {
    return this.repository.save(reference);
  }

  async exists(
    generationId: string,
    assetVersionId: string,
  ): Promise<boolean> {
    const reference = await this.repository.findOne({
      where: {
        generationId,
        assetVersionId,
      },
    });

    return reference !== null;
  }

  async findForGeneration(
    generationId: string,
  ): Promise<GenerationAssetReference[]>;

  async findForGeneration(
    generationId: string,
    userId: string,
  ): Promise<GenerationAssetReference[]>;

  async findForGeneration(
    generationId: string,
    _userId?: string,
  ): Promise<GenerationAssetReference[]> {
    return this.repository.find({
      where: {
        generationId,
      },
      order: {
        role: 'ASC',
      },
    });
  }
}
