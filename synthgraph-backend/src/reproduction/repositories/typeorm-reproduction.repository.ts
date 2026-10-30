import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { GenerationDatasetReference } from '../../database/entities/generation-dataset-reference.entity.js';

import { ReproductionRepository } from './reproduction.repository.js';

@Injectable()
export class TypeOrmReproductionRepository
  implements ReproductionRepository
{
  constructor(
    @InjectRepository(GenerationDatasetReference)
    private readonly datasetReferenceRepository: Repository<GenerationDatasetReference>,
  ) {}

  async findDatasetReferences(
    generationId: string,
  ): Promise<GenerationDatasetReference[]> {
    return this.datasetReferenceRepository.find({
      where: {
        generationId,
      },
      order: {
        role: 'ASC',
      },
    });
  }

  async findDatasetReferencesForGenerations(
    generationIds: string[],
  ): Promise<GenerationDatasetReference[]> {
    if (generationIds.length === 0) return [];

    return this.datasetReferenceRepository.find({
      where: {
        generationId: In(generationIds),
      },
      order: {
        role: 'ASC',
      },
    });
  }
}