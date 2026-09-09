import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

import { GenerationDatasetReferenceRepository } from './generation-dataset-reference.repository.js';

@Injectable()
export class TypeOrmGenerationDatasetReferenceRepository
  implements GenerationDatasetReferenceRepository
{
  constructor(
    @InjectRepository(GenerationDatasetReference)
    private readonly repository: Repository<GenerationDatasetReference>,
  ) {}

  async create(
    reference: GenerationDatasetReference,
  ): Promise<GenerationDatasetReference> {
    return this.repository.save(reference);
  }

  async exists(
    generationId: string,
    datasetVersionId: string,
  ): Promise<boolean> {
    const reference = await this.repository.findOne({
      where: {
        generationId,
        datasetVersionId,
      },
    });

    return reference !== null;
  }

  async findForGeneration(
    generationId: string,
  ): Promise<GenerationDatasetReference[]>;

  async findForGeneration(
    generationId: string,
    userId: string,
  ): Promise<GenerationDatasetReference[]>;

  async findForGeneration(
    generationId: string,
    _userId?: string,
  ): Promise<GenerationDatasetReference[]> {
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